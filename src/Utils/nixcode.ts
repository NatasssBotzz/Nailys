// @ts-nocheck
const VERSION = '4.4'
const NIXCODE_VERSION = VERSION

import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import sharp from 'sharp'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { createRequire } from 'module'
import webpmuxPkg from 'node-webpmux'
import archiverPkg from 'archiver'
import { proto } from '../../WAProto/index.js'
import { generateWAMessageContent, generateWAMessageFromContent, getContentType, prepareWAMessageMedia } from './messages.js'
import { downloadContentFromMessage, encryptedStream } from './messages-media.js'

function extractIE(text, { extract = true, hyperlink = true, citation = true, latex = true } = {}) {
  if (!extract) return { text, ie: [] }

  const ie = []
  let result = ''
  let last = 0
  let citation_index = 1
  let hyperlink_index = 0
  let latex_index = 0
  const stack = []

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '[' && text[i - 1] !== '\\') {
      stack.push(i)
    } else if (text[i] === ']' && (text[i + 1] === '(' || text[i + 1] === '<')) {
      const start = stack.pop()
      if (start == null) continue

      const open = text[i + 1]
      const close = open === '(' ? ')' : '>'
      const type = open === '(' ? 'link' : 'latex'
      let end = i + 2
      let depth = 1

      while (end < text.length && depth) {
        if (text[end] === open && text[end - 1] !== '\\') depth++
        else if (text[end] === close && text[end - 1] !== '\\') depth--
        end++
      }

      if (depth) continue

      const raw = text.slice(start + 1, i).trim()
      const url = text.slice(i + 2, end - 1).trim()
      let key
      let tag
      let data

      if (type === 'latex') {
        if (!latex) continue
        const [txt = '', width = null, height = null, font_height = null, padding = null] = raw.split('|')
        key = `NIXEL_LATEX_${latex_index++}`
        tag = `{{${key}}}${txt || 'image'}{{/${key}}}`
        data = {
          type: 'latex',
          ie: { key, text: txt, url, width, height, font_height, padding }
        }
      } else if (raw) {
        if (!hyperlink) continue
        key = `NIXEL_HYPERLINK_${hyperlink_index++}`
        tag = `{{${key}}}${raw}{{/${key}}}`
        data = {
          type: 'hyperlink',
          ie: { key, text: raw, url }
        }
      } else {
        if (!citation) continue
        key = `NIXEL_CITATION_${citation_index - 1}`
        tag = `{{${key}}}${url}{{/${key}}}`
        data = {
          type: 'citation',
          ie: {
            reference_id: citation_index++,
            key,
            text: '',
            url
          }
        }
      }

      result += text.slice(last, start) + tag
      last = end
      ie.push(data)
      i = end - 1
    }
  }

  result += text.slice(last)
  return { text: result, ie }
}

function extractHyperlink(text) {
  const extracted = extractIE(text, { latex: false })
  return {
    text: extracted.text,
    hyperlink: extracted.ie.map(({ ie }) => ({
      reference_id: ie.reference_id || 0,
      key: ie.key,
      text: ie.text,
      url: ie.url
    }))
  }
}

async function fetchBuffer(url, options = {}, config = {}) {
  try {
    const response = await fetch(url, options)
    if (!response.ok) throw Error(`HTTP ${response.status}`)
    return Buffer.from(await response.arrayBuffer())
  } catch (error) {
    if (config.silent) return Buffer.alloc(0)
    throw error
  }
}

async function resolveJpegThumbnail(input) {
  if (!input) return Buffer.alloc(0)

  let source = input
  try {
    if (typeof source === 'string') {
      if (/^https?:\/\//i.test(source)) source = await fetchBuffer(source, {}, { silent: true })
      else if (fs.existsSync(source)) source = fs.readFileSync(source)
      else source = Buffer.from(source)
    }

    if (!Buffer.isBuffer(source) || !source.length) return Buffer.alloc(0)

    return await sharp(source)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()
  } catch {
    return Buffer.isBuffer(source) ? source : Buffer.alloc(0)
  }
}

const DOC_MIMES = {
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  zip: 'application/zip',
  apk: 'application/vnd.android.package-archive',
  common: 'application/octet-stream',
  bin: 'application/octet-stream',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  txt: 'text/plain',
  js: 'text/javascript',
  json: 'application/json'
}

const DEFAULT_HEADER_FILE_LENGTH = 1099511627776
const DEFAULT_HEADER_PAGE_COUNT = 2026

function dummyPngBuffer() {
  return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
}

function dummyPdfBuffer(text = 'test') {
  const safe = String(text || 'test').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const stream = `BT\n/F1 24 Tf\n72 720 Td\n(${safe}) Tj\nET`
  const objects = []
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
  objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n')
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n')
  objects.push(`5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj\n`)

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += obj
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  return Buffer.from(pdf, 'utf8')
}

function normalizeHeaderType(type = 'png') {
  const clean = String(type || 'png').trim().toLowerCase().replace(/^\./, '')
  const ext = clean || 'png'
  return { ext, mimetype: DOC_MIMES[ext] || DOC_MIMES.common }
}

function makeHeaderDocument(type = 'png', options = {}) {
  if (typeof type === 'object' && type !== null && !Array.isArray(type)) {
    options = type
    type = options.type || options.ext || options.fileType || 'png'
  }

  const { ext, mimetype } = normalizeHeaderType(type)
  const title = String(options.title || options.name || 'test')
  const fileName = String(options.fileName || options.filename || `${title}.${ext}`)
  const rawBuffer = options.buffer ||
    options.document ||
    options.data ||
    (ext === 'png'
      ? dummyPngBuffer()
      : ext === 'pdf'
        ? dummyPdfBuffer(options.content || 'test')
        : Buffer.from(String(options.content || 'test'), 'utf-8'))

  const document = Buffer.isBuffer(rawBuffer)
    ? rawBuffer
    : Buffer.from(String(rawBuffer || 'test'), 'utf-8')

  const payload = {
    document,
    mimetype: options.mimetype || mimetype,
    fileName,
    title,
    fileLength: options.fileLength || options.fileSize || options.size || DEFAULT_HEADER_FILE_LENGTH,
    pageCount: options.pageCount || options.pages || DEFAULT_HEADER_PAGE_COUNT
  }

  if (options.thumbnail) payload.thumbnail = options.thumbnail
  if (options.caption) payload.caption = options.caption

  if (options.isForwarded || options.forwarded || options.contextInfo) {
    payload.contextInfo = {
      ...(options.isForwarded || options.forwarded
        ? {
            forwardingScore: Number(options.forwardingScore || 10),
            isForwarded: true,
            forwardOrigin: options.forwardOrigin || 'UNKNOWN'
          }
        : {}),
      ...(options.contextInfo || {})
    }
  }

  return payload
}

async function sendButtons(sock, toJid, content = {}, options = {}) {
  const buttons = Array.isArray(content.buttons) ? content.buttons : []
  const msg = generateWAMessageFromContent(
    toJid,
    {
      interactiveMessage: {
        header: {
          title: content.title || '',
          subtitle: content.subtitle || '',
          hasMediaAttachment: false
        },
        body: { text: content.body || content.text || '' },
        footer: { text: content.footer || '' },
        nativeFlowMessage: {
          buttons,
          messageParamsJson: content.messageParamsJson || ''
        }
      }
    },
    { quoted: options.quoted }
  )

  await sock.relayMessage(toJid, msg.message, { messageId: msg.key.id })
  return msg
}


// ─────────────────────────────────────────────────────────────
// SWGC / Status Grup RC13
// Logic dipindahkan dari swgc-rc13-helperpatch ke nixcode.
// ─────────────────────────────────────────────────────────────

function patchSwgcFile(file) {
  if (!fs.existsSync(file)) return { file, found: false, patched: false, already: false }

  const original = fs.readFileSync(file, 'utf8')
  let source = original

  source = source.replace(
    /(message\?\.associatedChildMessage)\s*\|\|\s*\n\s*message\?\.groupStatusMessage\s*\|\|\s*\n\s*message\?\.groupStatusMessageV2(\s*\);)/g,
    '$1$2'
  )

  source = source
    .replace(/\n\s*message\?\.groupStatusMessage\s*\|\|\s*\n\s*message\?\.groupStatusMessageV2(\s*\);)/g, '$1')
    .replace(/\n\s*message\?\.groupStatusMessageV2\s*\|\|\s*\n\s*message\?\.groupStatusMessage(\s*\);)/g, '$1')

  if (source !== original) {
    fs.writeFileSync(file, source)
    return { file, found: true, patched: true, already: false }
  }

  const already = !/message\?\.groupStatusMessage(?:V2)?/.test(source)
  return { file, found: true, patched: false, already }
}

function patchBaileysForSwgc() {
  const root = process.cwd()
  const candidates = [
    path.join(root, 'node_modules', 'naileys', 'lib', 'Utils', 'messages.js'),
    path.join(root, 'node_modules', 'baileys', 'lib', 'Utils', 'messages.js'),
    path.join(root, 'node_modules', '@whiskeysockets', 'baileys', 'lib', 'Utils', 'messages.js')
  ]

  const results = candidates.map(patchSwgcFile)
  const touched = results.filter(r => r.found)

  if (!touched.length) {
    console.log('[SWGC PATCH] node_modules naileys belum ada. Jalankan npm install dulu.')
    return false
  }

  for (const r of touched) {
    const rel = path.relative(root, r.file)
    if (r.patched) console.log('[SWGC PATCH] Naileys berhasil dipatch:', rel)
    else if (r.already) console.log('[SWGC PATCH] Naileys sudah terpatch:', rel)
    else console.log('[SWGC PATCH] Pola RC13 tidak berubah / tidak cocok:', rel)
  }

  return touched.some(r => r.patched || r.already)
}

function normalizeNumber(value = '') {
  const n = String(value || '').replace(/[^0-9]/g, '')
  if (!n) return ''
  if (n.startsWith('0')) return `62${n.slice(1)}`
  if (n.startsWith('8')) return `62${n}`
  return n
}

function decodeJid(jid = '') {
  const raw = String(jid || '')
  if (!raw) return raw
  return raw.replace(/:\d+@/i, '@')
}

function jidNumber(jid = '') {
  return normalizeNumber(decodeJid(jid).split('@')[0])
}

function isSameJidOrNumber(a = '', b = '') {
  if (!a || !b) return false
  if (String(a) === String(b)) return true
  const na = jidNumber(a)
  const nb = jidNumber(b)
  return !!na && !!nb && na === nb
}

function normalizePrefix(prefix = '.') {
  return typeof prefix === 'string' && prefix ? prefix : '.'
}

function swgcUnwrapMessage(message = {}) {
  let msg = message || {}
  for (let i = 0; i < 15; i++) {
    if (msg?.ephemeralMessage?.message) { msg = msg.ephemeralMessage.message; continue }
    if (msg?.viewOnceMessage?.message) { msg = msg.viewOnceMessage.message; continue }
    if (msg?.viewOnceMessageV2?.message) { msg = msg.viewOnceMessageV2.message; continue }
    if (msg?.viewOnceMessageV2Extension?.message) { msg = msg.viewOnceMessageV2Extension.message; continue }
    if (msg?.documentWithCaptionMessage?.message) { msg = msg.documentWithCaptionMessage.message; continue }
    break
  }
  return msg
}

function getBodyText(m = {}) {
  const msg = swgcUnwrapMessage(m?.message || m || {})
  const type = getContentType?.(msg) || Object.keys(msg || {})[0] || ''
  if (!type) return ''

  if (type === 'conversation') return msg.conversation || ''
  if (type === 'extendedTextMessage') return msg.extendedTextMessage?.text || ''
  if (type === 'imageMessage') return msg.imageMessage?.caption || ''
  if (type === 'videoMessage') return msg.videoMessage?.caption || ''
  if (type === 'documentMessage') return msg.documentMessage?.caption || ''
  if (type === 'buttonsResponseMessage') return msg.buttonsResponseMessage?.selectedButtonId || ''
  if (type === 'listResponseMessage') return msg.listResponseMessage?.singleSelectReply?.selectedRowId || ''
  if (type === 'templateButtonReplyMessage') return msg.templateButtonReplyMessage?.selectedId || ''

  const paramsJson = msg?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson
  if (paramsJson) {
    try {
      const parsed = JSON.parse(paramsJson)
      return parsed?.id || parsed?.selectedId || parsed?.selectedRowId || ''
    } catch {}
  }

  return ''
}

function getQuotedMessage(m = {}) {
  const msg = swgcUnwrapMessage(m?.message || m?.msg || {})
  if (!msg) return null

  const type = getContentType?.(msg) || Object.keys(msg || {})[0] || ''
  const node = msg?.[type]

  const quoted =
    node?.contextInfo?.quotedMessage ||
    msg?.extendedTextMessage?.contextInfo?.quotedMessage ||
    msg?.imageMessage?.contextInfo?.quotedMessage ||
    msg?.videoMessage?.contextInfo?.quotedMessage ||
    msg?.audioMessage?.contextInfo?.quotedMessage ||
    msg?.documentMessage?.contextInfo?.quotedMessage ||
    msg?.buttonsResponseMessage?.contextInfo?.quotedMessage ||
    msg?.listResponseMessage?.contextInfo?.quotedMessage ||
    msg?.interactiveResponseMessage?.contextInfo?.quotedMessage ||
    null

  return swgcUnwrapMessage(quoted)
}

function pickMediaNode(messageObject) {
  const msg = swgcUnwrapMessage(messageObject)
  if (!msg) return null

  const type = getContentType?.(msg) || Object.keys(msg || {})[0] || ''
  const node = msg?.[type]

  if (type === 'imageMessage') return { kind: 'image', node }
  if (type === 'videoMessage') return { kind: 'video', node }
  if (type === 'audioMessage') return { kind: 'audio', node }
  return null
}

async function downloadMediaBuffer(node, kind) {
  if (!downloadContentFromMessage) throw new Error('downloadContentFromMessage tidak tersedia di Naileys')
  const stream = await downloadContentFromMessage(node, kind)
  return await streamToBuffer(stream)
}

async function createStatusPayloadFromInput(m, text = '') {
  const msgObj = swgcUnwrapMessage(m?.message || m?.msg || {})
  const direct = pickMediaNode(msgObj)
  const quoted = pickMediaNode(getQuotedMessage(m))
  const inputCaption = String(text || '').trim()

  const media = direct || quoted
  if (media && ['image', 'video', 'audio'].includes(media.kind)) {
    const buffer = await downloadMediaBuffer(media.node, media.kind)
    const caption = inputCaption || String(media.node?.caption || '').trim()

    if (media.kind === 'image') return { type: 'image', buffer, caption }

    if (media.kind === 'video') {
      return {
        type: 'video',
        buffer,
        caption,
        mimetype: media.node?.mimetype || 'video/mp4',
        seconds: media.node?.seconds || undefined
      }
    }

    if (media.kind === 'audio') {
      return {
        type: 'audio',
        buffer,
        mimetype: media.node?.mimetype || 'audio/ogg; codecs=opus',
        seconds: media.node?.seconds || undefined,
        ptt: !!media.node?.ptt
      }
    }
  }

  if (inputCaption) return { type: 'text', text: inputCaption }
  return null
}

async function normalizeSwgcVideoBuffer(buffer) {
  const inFile = tmpFile('.mp4')
  const outFile = tmpFile('.mp4')

  try {
    fs.writeFileSync(inFile, buffer)
    await execFileAsync('ffmpeg', [
      '-y',
      '-i', inFile,
      '-movflags', '+faststart',
      '-pix_fmt', 'yuv420p',
      '-vf', 'scale=w=min(720\\,iw):h=-2:force_original_aspect_ratio=decrease',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '28',
      '-c:a', 'aac',
      '-b:a', '128k',
      outFile
    ], { timeout: 240000 })

    const out = fs.readFileSync(outFile)
    return out.length ? out : buffer
  } catch {
    return buffer
  } finally {
    try { fs.unlinkSync(inFile) } catch {}
    try { fs.unlinkSync(outFile) } catch {}
  }
}

function payloadToStatusContent(payload, config = {}) {
  if (!payload) return null

  if (payload.type === 'text') {
    return {
      text: payload.text,
      backgroundColor: config.textStatusBackground || '#0b141a'
    }
  }

  if (payload.type === 'image') return { image: payload.buffer, caption: payload.caption || '' }

  if (payload.type === 'video') {
    return {
      video: payload.buffer,
      caption: payload.caption || '',
      mimetype: payload.mimetype || 'video/mp4'
    }
  }

  if (payload.type === 'audio') {
    return {
      audio: payload.buffer,
      mimetype: payload.mimetype || 'audio/ogg; codecs=opus',
      seconds: payload.seconds,
      ptt: payload.ptt || false
    }
  }

  return null
}

function contentTypeOf(message = {}) {
  return getContentType?.(message) || Object.keys(message || {}).find(k => k !== 'messageContextInfo') || ''
}

function setGroupStatusContext(inner = {}) {
  const type = contentTypeOf(inner)
  if (!type || !inner?.[type] || typeof inner[type] !== 'object') return inner

  inner[type].contextInfo = {
    ...(inner[type].contextInfo || {}),
    isGroupStatus: true
  }
  return inner
}

function hasGroupStatusEnvelope(message = {}) {
  const msg = swgcUnwrapMessage(message || {})
  return !!(msg?.groupStatusMessageV2 || msg?.groupStatusMessage)
}

function waiterKey(groupJid, messageId) {
  return `${String(groupJid || '')}:${String(messageId || '')}`
}

function ensureSwgcWaiters(sock) {
  if (!sock.__swgcWaiters || !(sock.__swgcWaiters instanceof Map)) {
    Object.defineProperty(sock, '__swgcWaiters', {
      value: new Map(),
      enumerable: false,
      writable: true,
      configurable: true
    })
  }
  return sock.__swgcWaiters
}

function notifySwgcEcho(sock, msg = {}) {
  try {
    if (!sock?.__swgcWaiters || !msg?.key?.id) return false
    if (!hasGroupStatusEnvelope(msg.message || {})) return false

    const key = waiterKey(msg.key.remoteJid, msg.key.id)
    const waiters = sock.__swgcWaiters
    const waiter = waiters.get(key)
    if (!waiter) return false

    waiters.delete(key)
    clearTimeout(waiter.timer)
    waiter.resolve({ ok: true, msg })
    return true
  } catch {
    return false
  }
}

function waitForSwgcEcho(sock, groupJid, messageId, timeoutMs = 10000) {
  return new Promise(resolve => {
    const waiters = ensureSwgcWaiters(sock)
    const key = waiterKey(groupJid, messageId)

    const timer = setTimeout(() => {
      waiters.delete(key)
      resolve({ ok: false, timeout: true })
    }, Math.max(1500, Number(timeoutMs) || 10000))

    waiters.set(key, { resolve, timer })
  })
}

async function groupStatus(sock, jid, content, options = {}) {
  if (!sock || typeof sock.relayMessage !== 'function') throw new Error('Socket belum siap')
  if (!jid || !String(jid).endsWith('@g.us')) throw new Error('Target bukan grup')
  if (!generateWAMessageContent || !generateWAMessageFromContent) {
    throw new Error('Naileys tidak punya generateWAMessageContent/generateWAMessageFromContent')
  }

  const cloned = { ...content }
  const { backgroundColor } = cloned
  delete cloned.backgroundColor

  const inside = await generateWAMessageContent(cloned, {
    upload: sock.waUploadToServer,
    backgroundColor
  })

  setGroupStatusContext(inside)

  const messageSecret = crypto.randomBytes(32)
  const payload = {
    messageContextInfo: { messageSecret },
    groupStatusMessageV2: {
      message: {
        ...inside,
        messageContextInfo: { messageSecret }
      }
    }
  }

  const msg = generateWAMessageFromContent(
    jid,
    payload,
    {
      userJid: sock.user?.id,
      logger: sock.logger
    }
  )

  const echoPromise = options.verifyEcho !== false
    ? waitForSwgcEcho(sock, jid, msg.key.id, options.verifyTimeoutMs || 10000)
    : null

  try {
    await sock.relayMessage(jid, msg.message, { messageId: msg.key.id })
  } catch (err) {
    if (echoPromise) ensureSwgcWaiters(sock).delete(waiterKey(jid, msg.key.id))
    throw err
  }

  if (echoPromise) {
    const echo = await echoPromise
    if (!echo.ok) {
      throw new Error(
        'Relay SWGC diterima server, tapi tidak ada echo groupStatusMessageV2 dari WhatsApp. ' +
        'Biasanya berarti format belum dirender sebagai status grup, bot belum sync, atau akun WhatsApp belum support fitur ini.'
      )
    }
  }

  return msg
}

async function sendPayloadToGroupStatus(sock, targetJid, payload, config = {}) {
  if (payload?.type === 'video' && payload?.buffer && config.normalizeVideo !== false) {
    payload = {
      ...payload,
      buffer: await normalizeSwgcVideoBuffer(payload.buffer),
      mimetype: 'video/mp4'
    }
  }

  const content = payloadToStatusContent(payload, config)
  if (!content) throw new Error('Payload SWGC tidak valid')
  return await groupStatus(sock, targetJid, content, {
    verifyEcho: config.verifyEcho !== false,
    verifyTimeoutMs: config.verifyTimeoutMs || 10000
  })
}

async function buildGroupList(sock) {
  const all = await sock.groupFetchAllParticipating()
  return Object.values(all || {})
    .map(g => ({
      id: g?.id,
      subject: g?.subject || g?.name || 'Tanpa Nama'
    }))
    .filter(g => g.id && String(g.id).endsWith('@g.us'))
    .sort((a, b) => a.subject.localeCompare(b.subject))
}

function makeGroupListText(groups = [], limit = 120) {
  const max = Math.max(1, Number(limit) || 120)
  const shown = groups.slice(0, max)
  const rows = shown.map((g, i) => `${i + 1}. ${g.subject}\n   ${g.id}`)
  const more = groups.length > shown.length ? `\n\n+${groups.length - shown.length} grup lain tidak ditampilkan.` : ''
  return rows.join('\n\n') + more
}

async function resolveGroupTarget(sock, input = '', groups = []) {
  const raw = String(input || '').trim()
  if (!raw) return null

  if (/^\d+$/.test(raw)) {
    const idx = Number(raw) - 1
    return groups[idx]?.id || null
  }

  if (raw.endsWith('@g.us')) return raw

  const inviteMatch = raw.match(/chat\.whatsapp\.com\/([0-9A-Za-z]+)/i)
  if (inviteMatch?.[1]) {
    const info = await sock.groupGetInviteInfo(inviteMatch[1])
    if (info?.id) return String(info.id).endsWith('@g.us') ? info.id : `${info.id}@g.us`
  }

  const exact = groups.find(g => g.subject.toLowerCase() === raw.toLowerCase())
  if (exact) return exact.id

  const contains = groups.filter(g => g.subject.toLowerCase().includes(raw.toLowerCase()))
  if (contains.length === 1) return contains[0].id

  return null
}

function splitTargetAndContent(text = '') {
  const raw = String(text || '').trim()
  const parts = raw.split('|')
  if (parts.length < 2) return { targetText: '', contentText: raw }
  return {
    targetText: parts.shift().trim(),
    contentText: parts.join('|').trim()
  }
}

function isGroupAdmin(groupMetadata = {}, senderJid = '') {
  const participants = groupMetadata?.participants || []
  return participants.some(p => {
    const ids = [p?.id, p?.jid, p?.lid, p?.pn, p?.phoneNumber].filter(Boolean)
    const match = ids.some(id => isSameJidOrNumber(id, senderJid))
    const admin = p?.admin === 'admin' || p?.admin === 'superadmin'
    return match && admin
  })
}

async function sendSwgc(sock, targetJid, input, options = {}) {
  let payload = null

  if (typeof input === 'string') {
    payload = { type: 'text', text: input }
  } else if (Buffer.isBuffer(input)) {
    payload = {
      type: options.type || options.kind || 'image',
      buffer: input,
      caption: options.caption || '',
      mimetype: options.mimetype
    }
  } else if (input?.type && (input.buffer || input.text)) {
    payload = input
  } else if (input?.image || input?.video || input?.audio || input?.text) {
    const kind = input.image ? 'image' : input.video ? 'video' : input.audio ? 'audio' : 'text'
    payload = kind === 'text'
      ? { type: 'text', text: input.text }
      : {
          type: kind,
          buffer: input[kind],
          caption: input.caption || '',
          mimetype: input.mimetype,
          seconds: input.seconds,
          ptt: input.ptt
        }
  } else if (input?.message || input?.msg) {
    payload = await createStatusPayloadFromInput(input, options.text || options.caption || '')
  }

  if (!payload) throw new Error('Input SWGC tidak valid')
  return await sendPayloadToGroupStatus(sock, targetJid, payload, options)
}

function patchSocketSwgc(sock) {
  if (!sock || typeof sock !== 'object') return sock
  if (typeof sock.swgc !== 'function') {
    Object.defineProperty(sock, 'swgc', {
      value: async (targetJid, input, options = {}) => sendSwgc(sock, targetJid, input, options),
      enumerable: false,
      configurable: true,
      writable: true
    })
  }
  return sock
}

class Swgc {
  #client

  constructor(client) {
    if (!client) throw new Error('Socket is required')
    this.#client = client
    this._target = ''
    this._payload = null
    this._options = {}
  }

  target(jid = '') { this._target = jid; return this }
  setTarget(jid = '') { return this.target(jid) }

  text(value = '') {
    this._payload = { type: 'text', text: String(value || '') }
    return this
  }

  media(buffer, type = 'image', options = {}) {
    this._payload = { type, buffer, ...options }
    return this
  }

  image(buffer, caption = '') { return this.media(buffer, 'image', { caption }) }
  video(buffer, caption = '') { return this.media(buffer, 'video', { caption, mimetype: 'video/mp4' }) }
  audio(buffer, options = {}) { return this.media(buffer, 'audio', options) }

  async fromInput(msg, text = '') {
    this._payload = await createStatusPayloadFromInput(msg, text)
    return this
  }

  swgc(input, targetJid = '', options = {}) {
    if (targetJid) this.target(targetJid)
    this._options = { ...this._options, ...options }

    if (typeof input === 'string') return this.text(input)
    if (Buffer.isBuffer(input)) return this.media(input, options.type || options.kind || 'image', options)
    if (input?.type) {
      this._payload = input
      return this
    }

    this._payload = input
    return this
  }

  async send(targetJid = '', options = {}) {
    const target = targetJid || this._target
    const opts = { ...this._options, ...options }
    return await sendSwgc(this.#client, target, this._payload, opts)
  }
}


class BaseBuilder {
  constructor() {
    this._title = ''
    this._subtitle = ''
    this._body = ''
    this._footer = ''
    this._contextInfo = {}
    this._extraPayload = {}
  }

  setTitle(title) {
    if (typeof title !== 'string') throw new TypeError('Title must be a string')
    this._title = title
    return this
  }

  setSubtitle(subtitle) {
    if (typeof subtitle !== 'string') throw new TypeError('Subtitle must be a string')
    this._subtitle = subtitle
    return this
  }

  setBody(body) {
    if (typeof body !== 'string') throw new TypeError('Body must be a string')
    this._body = body
    return this
  }

  setFooter(footer) {
    if (typeof footer !== 'string') throw new TypeError('Footer must be a string')
    this._footer = footer
    return this
  }

  setContextInfo(obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      throw new TypeError('ContextInfo must be a plain object')
    }
    this._contextInfo = obj
    return this
  }

  addPayload(obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      throw new TypeError('Payload must be a plain object')
    }
    Object.assign(this._extraPayload, obj)
    return this
  }

  static async resize(buffer, x, y, fit = 'cover') {
    return await sharp(buffer)
      .resize(x, y, {
        fit,
        position: 'center',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer()
  }

  static async fetchBuffer(url, options = {}, config = {}) {
    return await fetchBuffer(url, options, config)
  }
}



function buildBookingConfirmationParams(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('BookingConfirmation params must be a plain object')
  }

  const now = Date.now()
  const start = input.start_datetime || input.startDatetime || input.start || new Date(now + 60_000).toISOString()
  const end = input.end_datetime || input.endDatetime || input.end || new Date(now + 660_000).toISOString()

  return {
    start_datetime: String(start),
    end_datetime: String(end),
    location: String(input.location || ''),
    booking_url: String(input.booking_url || input.bookingUrl || input.url || ''),
    phone_number: String(input.phone_number || input.phoneNumber || input.number || ''),
    booking_management_url: String(input.booking_management_url || input.bookingManagementUrl || input.management_url || ''),
    description: String(input.description || ''),
    email: String(input.email || ''),
    display_text: String(input.display_text || input.displayText || input.text || ''),
    display_content: {
      display_language: String(input.display_content?.display_language || input.displayLanguage || 'id'),
      display_meeting_type: String(input.display_content?.display_meeting_type || input.meetingType || ''),
      display_bottom_sheet_header: String(input.display_content?.display_bottom_sheet_header || input.bottomSheetHeader || ''),
      display_add_to_calendar_cta_text: String(input.display_content?.display_add_to_calendar_cta_text || input.addToCalendarText || 'CALENDAR'),
      display_view_on_maps_cta_text: String(input.display_content?.display_view_on_maps_cta_text || input.viewOnMapsText || ''),
      display_manage_booking_cta_text: String(input.display_content?.display_manage_booking_cta_text || input.manageBookingText || ''),
      display_manage_booking_not_supported_text: String(input.display_content?.display_manage_booking_not_supported_text || input.manageBookingNotSupportedText || ''),
      display_read_more: String(input.display_content?.display_read_more || input.readMoreText || '')
    }
  }
}


class Button extends BaseBuilder {
  #client

  constructor(client) {
    super()
    if (!client) throw new Error('Socket is required')
    this.#client = client
    this._buttons = []
    this._data = undefined
    this._currentSelectionIndex = -1
    this._currentSectionIndex = -1
    this._params = {}
  }

  setVideo(path, options = {}) {
    if (!path) throw new Error('Url or buffer needed')
    this._data = Buffer.isBuffer(path) ? { video: path, ...options } : { video: { url: path }, ...options }
    return this
  }

  setImage(path, options = {}) {
    if (!path) throw new Error('Url or buffer needed')
    this._data = Buffer.isBuffer(path) ? { image: path, ...options } : { image: { url: path }, ...options }
    return this
  }

  setDocument(path, options = {}) {
    if (!path) throw new Error('Url or buffer needed')
    this._data = Buffer.isBuffer(path) ? { document: path, ...options } : { document: { url: path }, ...options }
    return this
  }

  addHeader(type = 'png', options = {}) {
    this._data = makeHeaderDocument(type, options)
    return this
  }

  addheader(type = 'png', options = {}) {
    return this.addHeader(type, options)
  }

  setMedia(obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      throw new TypeError('Media must be a plain object')
    }
    this._data = obj
    return this
  }

  clearButtons() {
    this._buttons = []
    return this
  }

  setParams(obj = {}) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      throw new TypeError('Params must be a plain object')
    }
    this._params = obj
    return this
  }

  setLimitedOffer(input = {}) {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new TypeError('LimitedOffer must be a plain object')
    }

    const offer = {
      text: typeof input.text === 'string' ? input.text : (typeof input.display_text === 'string' ? input.display_text : ''),
      url: typeof input.url === 'string' ? input.url : (typeof input.link === 'string' ? input.link : '')
    }

    const copyCode = typeof input.copy_code === 'string'
      ? input.copy_code
      : (typeof input.code === 'string' ? input.code : '')
    if (copyCode) offer.copy_code = copyCode

    const hideExpiration = input.hideExpiration === true || input.noExpiration === true || input.expiration === false
    const expiresAt = input.expiresAt || input.expires_at || input.expires || input.expiration_time
    let expiryMs = 0

    if (!hideExpiration) {
      if (expiresAt instanceof Date) expiryMs = expiresAt.getTime()
      else if (typeof expiresAt === 'number') expiryMs = expiresAt < 10_000_000_000 ? expiresAt * 1000 : expiresAt
      else if (typeof expiresAt === 'string' && expiresAt.trim()) {
        const parsed = Number(expiresAt)
        if (Number.isFinite(parsed)) expiryMs = parsed < 10_000_000_000 ? parsed * 1000 : parsed
        else {
          const date = new Date(expiresAt)
          if (!Number.isNaN(date.getTime())) expiryMs = date.getTime()
        }
      }

      if (!expiryMs && typeof input.durationMs === 'number') expiryMs = Date.now() + input.durationMs
      if (!expiryMs && typeof input.durationSeconds === 'number') expiryMs = Date.now() + (input.durationSeconds * 1000)
      if (!expiryMs && typeof input.durationMinutes === 'number') expiryMs = Date.now() + (input.durationMinutes * 60_000)
      if (!expiryMs && typeof input.durationHours === 'number') expiryMs = Date.now() + (input.durationHours * 3_600_000)
    }

    if (expiryMs) offer.expiration_time = expiryMs

    this._params = { ...this._params, limited_time_offer: offer }
    return this
  }

  clearLimitedOffer() {
    if (this._params?.limited_time_offer) {
      const { limited_time_offer, ...rest } = this._params
      this._params = rest
    }
    return this
  }

  addButton(name, params = {}) {
    this._buttons.push({
      name,
      buttonParamsJson: typeof params === 'string' ? params : JSON.stringify(params)
    })
    return this
  }

  addbutton(name, params = {}) {
    return this.addButton(name, params)
  }

  addBookingConfirmation(params = {}) {
    this._buttons.push({
      name: 'booking_confirmation',
      buttonParamsJson: JSON.stringify(buildBookingConfirmationParams(params))
    })
    return this
  }

  addBooking(params = {}) {
    return this.addBookingConfirmation(params)
  }

  makeRow(header = '', title = '', description = '', id = '') {
    if (this._currentSelectionIndex === -1 || this._currentSectionIndex === -1) {
      throw new Error('You need to create a selection and a section first')
    }
    const buttonParams = JSON.parse(this._buttons[this._currentSelectionIndex].buttonParamsJson)
    buttonParams.sections[this._currentSectionIndex].rows.push({ header, title, description, id })
    this._buttons[this._currentSelectionIndex].buttonParamsJson = JSON.stringify(buttonParams)
    return this
  }

  makeSection(title = '', highlight_label = '') {
    if (this._currentSelectionIndex === -1) {
      throw new Error('You need to create a selection first')
    }
    const buttonParams = JSON.parse(this._buttons[this._currentSelectionIndex].buttonParamsJson)
    buttonParams.sections.push({ title, highlight_label, rows: [] })
    this._currentSectionIndex = buttonParams.sections.length - 1
    this._buttons[this._currentSelectionIndex].buttonParamsJson = JSON.stringify(buttonParams)
    return this
  }

  makeSections(title = '', highlight_label = '') {
    return this.makeSection(title, highlight_label)
  }

  addSelection(title, options = {}) {
    this._buttons.push({
      ...options,
      name: 'single_select',
      buttonParamsJson: JSON.stringify({ title, sections: [] })
    })
    this._currentSelectionIndex = this._buttons.length - 1
    this._currentSectionIndex = -1
    return this
  }

  addReply(display_text = '', id = '', options = {}) {
    this._buttons.push({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text, id, ...options })
    })
    return this
  }

  addCall(display_text = '', id = '', options = {}) {
    this._buttons.push({
      name: 'cta_call',
      buttonParamsJson: JSON.stringify({ display_text, id, ...options })
    })
    return this
  }

  addReminder(display_text = '', id = '', options = {}) {
    this._buttons.push({
      name: 'cta_reminder',
      buttonParamsJson: JSON.stringify({ display_text, id, ...options })
    })
    return this
  }

  addCancelReminder(display_text = '', id = '', options = {}) {
    this._buttons.push({
      name: 'cta_cancel_reminder',
      buttonParamsJson: JSON.stringify({ display_text, id, ...options })
    })
    return this
  }

  addAddress(display_text = '', id = '', options = {}) {
    this._buttons.push({
      name: 'address_message',
      buttonParamsJson: JSON.stringify({ display_text, id, ...options })
    })
    return this
  }

  addLocation(options = {}) {
    this._buttons.push({
      name: 'send_location',
      buttonParamsJson: JSON.stringify(options)
    })
    return this
  }

  addUrl(display_text = '', url = '', webview_interaction = false, options = {}) {
    this._buttons.push({
      ...options,
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({
        display_text,
        url,
        webview_interaction,
        merchant_url: options.merchant_url || url,
        ...options
      })
    })
    return this
  }

  addCopy(display_text = '', copy_code = '', options = {}) {
    if (typeof options === 'string') options = { id: options }
    this._buttons.push({
      name: 'cta_copy',
      buttonParamsJson: JSON.stringify({
        display_text,
        copy_code,
        ...options
      })
    })
    return this
  }

  static paramsList = {
    limited_time_offer: {
      text: 'string',
      url: 'string',
      copy_code: 'string',
      expiration_time: 'number'
    },
    bottom_sheet: {
      in_thread_buttons_limit: 'number',
      divider_indices: ['number'],
      list_title: 'string',
      button_title: 'string'
    },
    tap_target_configuration: {
      title: 'string',
      description: 'string',
      canonical_url: 'string',
      domain: 'string',
      buttonIndex: 'number'
    }
  }

  async toCard() {
    const preparedMedia = this._data
      ? await prepareWAMessageMedia(this._data, { upload: this.#client.waUploadToServer }).catch((error) => {
          if (String(error).includes('Invalid media type')) return this._data
          throw error
        })
      : {}

    if (preparedMedia.documentMessage) {
      const jpegThumbnail = await resolveJpegThumbnail(this._data?.thumbnail)
      if (Buffer.isBuffer(jpegThumbnail) && jpegThumbnail.length) preparedMedia.documentMessage.jpegThumbnail = jpegThumbnail
      if (this._data?.fileLength) preparedMedia.documentMessage.fileLength = this._data.fileLength
      if (this._data?.pageCount) preparedMedia.documentMessage.pageCount = this._data.pageCount
      if (this._data?.title) preparedMedia.documentMessage.title = this._data.title
      if (this._data?.fileName) preparedMedia.documentMessage.fileName = this._data.fileName
      if (this._data?.caption) preparedMedia.documentMessage.caption = this._data.caption
      if (this._data?.contextInfo) {
        preparedMedia.documentMessage.contextInfo = {
          ...(preparedMedia.documentMessage.contextInfo || {}),
          ...this._data.contextInfo
        }
      }
    }

    return {
      body: { text: this._body },
      footer: { text: this._footer },
      header: {
        title: this._title,
        subtitle: this._subtitle,
        hasMediaAttachment: !!this._data,
        ...preparedMedia
      },
      nativeFlowMessage: {
        messageParamsJson: JSON.stringify(this._params),
        buttons: this._buttons
      }
    }
  }

  async build(jid, { ...options } = {}) {
    const message = await this.toCard()
    return generateWAMessageFromContent(jid, {
      ...this._extraPayload,
      interactiveMessage: {
        ...message,
        contextInfo: this._contextInfo
      }
    }, { ...options })
  }

  async send(jid, { ...options } = {}) {
    const msg = await this.build(jid, options)
    await this.#client.relayMessage(msg.key.remoteJid, msg.message, {
      messageId: msg.key.id,
      additionalNodes: [
        {
          tag: 'biz',
          attrs: {},
          content: [
            {
              tag: 'interactive',
              attrs: { type: 'native_flow', v: '1' },
              content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
            }
          ]
        }
      ],
      ...options
    })
    return msg
  }
}

class ButtonV2 extends BaseBuilder {
  #client

  constructor(client) {
    super()
    if (!client) throw new Error('Socket is required')
    this.#client = client
    this._image = undefined
    this._data = undefined
    this._buttons = []
    this._nativeButtons = []
    this._params = {}
    this._locationMessage = {}
  }

  addButton(displayText = '', buttonId = crypto.randomUUID(), options = {}) {
    if (typeof options === 'string') options = { action: options }
    if (typeof options !== 'object' || options === null || Array.isArray(options)) {
      throw new TypeError('Button options must be a plain object')
    }

    const action = options.action || options.name || 'reply'
    let id = buttonId

    if (action !== 'reply') {
      const payload = {
        action,
        id: buttonId,
        displayText,
        copy_code: options.copy_code || options.copyCode || '',
        url: options.url || '',
        title: options.title || displayText,
        sections: options.sections || [],
        text: options.text || ''
      }
      id = `btnv2:${Buffer.from(JSON.stringify(payload)).toString('base64url')}`
    }

    this._buttons.push({
      buttonId: id,
      buttonText: { displayText },
      type: 1
    })
    return this
  }

  addRawButton(obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      throw new TypeError('Buttons must be a plain object')
    }

    const normalizeParams = value => {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch {
          return {}
        }
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value
      return {}
    }

    const makeParamsJson = (params, extra = {}) => {
      const globalParams = this._params && typeof this._params === 'object' ? this._params : {}
      const rawParams = obj.params && typeof obj.params === 'object' && !Array.isArray(obj.params) ? obj.params : {}
      return JSON.stringify({
        ...globalParams,
        ...rawParams,
        ...extra,
        ...normalizeParams(params)
      })
    }

    const pushOldButton = button => {
      const { params, ...cleanButton } = button
      const localParams = params && typeof params === 'object' && !Array.isArray(params) ? params : {}

      if (cleanButton.nativeFlowInfo?.paramsJson) {
        this._buttons.push({
          ...cleanButton,
          nativeFlowInfo: {
            ...cleanButton.nativeFlowInfo,
            paramsJson: makeParamsJson(cleanButton.nativeFlowInfo.paramsJson, localParams)
          }
        })
        return
      }

      this._buttons.push(cleanButton)
    }

    if (Array.isArray(obj.buttons)) {
      for (const button of obj.buttons) {
        if (typeof button === 'object' && button !== null && !Array.isArray(button)) pushOldButton(button)
      }
      return this
    }

    if (obj.name && Object.prototype.hasOwnProperty.call(obj, 'buttonParamsJson')) {
      this._nativeButtons.push({
        name: obj.name,
        buttonParamsJson: makeParamsJson(obj.buttonParamsJson)
      })
      return this
    }

    pushOldButton(obj)
    return this
  }

  setParams(obj = {}) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      throw new TypeError('Params must be a plain object')
    }
    this._params = obj
    return this
  }

  addNativeButton(name, params = {}) {
    this._nativeButtons.push({
      name,
      buttonParamsJson: typeof params === 'string' ? params : JSON.stringify(params)
    })
    return this
  }

  addNativeReply(display_text = '', id = crypto.randomUUID()) {
    return this.addButton(display_text, id, { action: 'quick_reply' })
  }

  addUrl(display_text = '', url = '', webview_interaction = false) {
    return this.addButton(display_text, crypto.randomUUID(), { action: 'url', url, webview_interaction })
  }

  addCopy(display_text = '', copy_code = '', id = crypto.randomUUID()) {
    this._buttons.push({
      buttonText: { displayText: display_text },
      buttonId: id,
      type: 1,
      nativeFlowInfo: {
        name: 'cta_copy',
        paramsJson: JSON.stringify({ display_text, copy_code, id })
      }
    })
    return this
  }

  addCall(display_text = '', id = crypto.randomUUID()) {
    return this.addButton(display_text, id, { action: 'call' })
  }

  addLocation(display_text = 'Location', id = crypto.randomUUID()) {
    return this.addButton(display_text, id, { action: 'location' })
  }

  addSelection(title = '', sections = [], id = crypto.randomUUID(), displayText = title) {
    this._buttons.push({
      buttonText: { displayText },
      buttonId: id,
      type: 1,
      nativeFlowInfo: {
        name: 'single_select',
        paramsJson: JSON.stringify({ title, sections })
      }
    })
    return this
  }

  addBottomSheet(displayText = 'Pilih', title = 'Menu', sections = [], id = crypto.randomUUID()) {
    return this.addSelection(title, sections, id, displayText)
  }

  setThumbnail(path) {
    if (!path) throw new Error('Url or buffer needed')
    this._image = path
    return this
  }

  setLocationMessage(obj = {}) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      throw new TypeError('LocationMessage must be a plain object')
    }
    this._locationMessage = obj
    return this
  }

  setMedia(obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      throw new TypeError('Media must be a plain object')
    }
    this._data = obj
    return this
  }

  async buildNative(jid, { ...options } = {}) {
    const header = {
      title: this._title,
      subtitle: this._subtitle,
      hasMediaAttachment: !!this._data,
      ...(this._data ? await prepareWAMessageMedia(this._data, { upload: this.#client.waUploadToServer }) : {})
    }
    return generateWAMessageFromContent(jid, {
      ...this._extraPayload,
      interactiveMessage: {
        body: { text: this._body },
        footer: { text: this._footer },
        header,
        contextInfo: this._contextInfo,
        nativeFlowMessage: {
          messageParamsJson: JSON.stringify(this._params),
          buttons: [...this._nativeButtons]
        }
      }
    }, { ...options })
  }

  async buildOld(jid, { ...options } = {}) {
    const _thumbnail = this._image
      ? await BaseBuilder.resize(Buffer.isBuffer(this._image) ? this._image : await BaseBuilder.fetchBuffer(this._image, {}, { silent: true }), 300, 300, 'contain')
      : null

    return generateWAMessageFromContent(jid, {
      ...this._extraPayload,
      buttonsMessage: {
        contentText: this._body,
        footerText: this._footer,
        ...(this._data ? this._data : {
          headerType: 6,
          locationMessage: {
            degreesLatitude: 0,
            degreesLongitude: 0,
            name: this._title,
            address: this._subtitle,
            url: '',
            isLive: true,
            comment: '',
            ...this._locationMessage,
            jpegThumbnail: _thumbnail
          }
        }),
        viewOnce: true,
        contextInfo: this._contextInfo,
        messageParamsJson: JSON.stringify(this._params),
        buttons: [...this._buttons]
      }
    }, { ...options })
  }

  async build(jid, { ...options } = {}) {
    if (this._nativeButtons.length) return await this.buildNative(jid, options)
    return await this.buildOld(jid, options)
  }

  async send(jid, { ...options } = {}) {
    if (this._buttons.length < 1 && this._nativeButtons.length < 1) {
      throw new Error('ButtonV2 requires at least one button')
    }
    const msg = await this.build(jid, options)
    await this.#client.relayMessage(msg.key.remoteJid, msg.message, {
      messageId: msg.key.id,
      additionalNodes: [
        {
          tag: 'biz',
          attrs: {},
          content: [
            {
              tag: 'interactive',
              attrs: { type: 'native_flow', v: '1' },
              content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
            }
          ]
        }
      ],
      ...options
    })
    return msg
  }
}


const CAROUSEL_INVISIBLE_TEXT = '\u200e'

function carouselInvisibleText() {
  return CAROUSEL_INVISIBLE_TEXT
}

function carouselHasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function parseMessageParamsJson(value) {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return { ...value }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function normalizeLimitOfferInput(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null

  const text = typeof input.text === 'string'
    ? input.text
    : (typeof input.display_text === 'string' ? input.display_text : '')

  const url = typeof input.url === 'string'
    ? input.url
    : (typeof input.link === 'string' ? input.link : '')

  const copy_code = typeof input.copy_code === 'string'
    ? input.copy_code
    : (typeof input.code === 'string' ? input.code : '')

  const thumbnailUrl = typeof input.thumbnailUrl === 'string'
    ? input.thumbnailUrl
    : (typeof input.thumbnail_url === 'string' ? input.thumbnail_url : '')

  const expiresAt = input.expiresAt || input.expires_at || input.expires || input.expiration_time || null
  const noExpiration = input.noExpiration === true || input.hideExpiration === true || input.expiration === false

  return { text, url, copy_code, expiresAt, thumbnailUrl, noExpiration }
}

function buildLimitedOfferParam(input = {}) {
  const offer = normalizeLimitOfferInput(input)
  if (!offer) return null

  const out = {
    text: offer.text || '',
    url: offer.url || '',
    copy_code: offer.copy_code || ''
  }

  if (offer.thumbnailUrl) out.thumbnail_url = offer.thumbnailUrl

  if (!offer.noExpiration && offer.expiresAt) {
    let expiryMs = 0

    if (offer.expiresAt instanceof Date) expiryMs = offer.expiresAt.getTime()
    else if (typeof offer.expiresAt === 'number') expiryMs = offer.expiresAt < 10_000_000_000 ? offer.expiresAt * 1000 : offer.expiresAt
    else if (typeof offer.expiresAt === 'string') {
      const parsed = Number(offer.expiresAt)
      if (Number.isFinite(parsed)) expiryMs = parsed < 10_000_000_000 ? parsed * 1000 : parsed
      else {
        const date = new Date(offer.expiresAt)
        if (!Number.isNaN(date.getTime())) expiryMs = date.getTime()
      }
    }

    if (expiryMs) out.expiration_time = expiryMs
  }

  return out
}

function mergeLimitedOfferParams(messageParamsJson, limitOffer) {
  const params = parseMessageParamsJson(messageParamsJson)

  if (params.limitOffer && !limitOffer) {
    limitOffer = params.limitOffer
    delete params.limitOffer
  }

  if (limitOffer) {
    const offer = buildLimitedOfferParam(limitOffer)
    if (offer) params.limited_time_offer = offer
  }

  return params
}

function stringifyParamsIfAny(params = {}) {
  return Object.keys(params || {}).length ? JSON.stringify(params) : ''
}

function cleanCarouselCardTexts(card = {}) {
  if (card.body && typeof card.body === 'object' && !carouselHasText(card.body.text || '')) delete card.body
  if (card.footer && typeof card.footer === 'object' && !carouselHasText(card.footer.text || '')) delete card.footer

  if (card.header && typeof card.header === 'object') {
    if (!carouselHasText(card.header.title || '')) delete card.header.title
    if (!carouselHasText(card.header.subtitle || '')) delete card.header.subtitle
  }

  return card
}

function injectLimitedOfferToCard(card = {}, limitOffer = null) {
  if (!card || typeof card !== 'object' || Array.isArray(card)) {
    throw new TypeError('Carousel card must be a plain object')
  }

  const cardOffer = limitOffer || card.limitOffer || card.offer || card.limit_offer || null
  delete card.limitOffer
  delete card.offer
  delete card.limit_offer

  if (cardOffer || card?.nativeFlowMessage?.messageParamsJson) {
    card.nativeFlowMessage = card.nativeFlowMessage || { buttons: [] }
    card.nativeFlowMessage.buttons = Array.isArray(card.nativeFlowMessage.buttons)
      ? card.nativeFlowMessage.buttons
      : []

    const params = mergeLimitedOfferParams(card.nativeFlowMessage.messageParamsJson, cardOffer)
    const json = stringifyParamsIfAny(params)

    if (json) card.nativeFlowMessage.messageParamsJson = json
    else delete card.nativeFlowMessage.messageParamsJson
  }

  return cleanCarouselCardTexts(card)
}

function buildAuthorButton(button = {}) {
  if (!button || typeof button !== 'object') return null

  if (button.name && Object.prototype.hasOwnProperty.call(button, 'buttonParamsJson')) {
    return {
      name: button.name,
      buttonParamsJson: typeof button.buttonParamsJson === 'string'
        ? button.buttonParamsJson
        : JSON.stringify(button.buttonParamsJson || {})
    }
  }

  const type = button.type || button.name || button.action || 'quick_reply'

  if (type === 'quick_reply' || type === 'reply') {
    return {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: button.display_text || button.displayText || button.text || carouselInvisibleText(),
        id: button.id || button.buttonId || ''
      })
    }
  }

  if (type === 'cta_url' || type === 'url') {
    const url = button.url || button.link || ''
    return {
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({
        display_text: button.display_text || button.displayText || button.text || carouselInvisibleText(),
        url,
        merchant_url: button.merchant_url || url
      })
    }
  }

  if (type === 'cta_copy' || type === 'copy') {
    return {
      name: 'cta_copy',
      buttonParamsJson: JSON.stringify({
        display_text: button.display_text || button.displayText || button.text || '',
        copy_code: button.copy_code || button.code || '',
        id: button.id || ''
      })
    }
  }

  return null
}

async function buildCarouselCardFromContent(sock, card = {}, options = {}) {
  const builder = new Button(sock)

  const safeBody = typeof card.body === 'string'
    ? card.body
    : (typeof card.text === 'string' ? card.text : '')

  builder
    .setTitle(typeof card.title === 'string' ? card.title : (typeof card.header === 'string' ? card.header : ''))
    .setSubtitle(typeof card.subtitle === 'string' ? card.subtitle : '')
    .setBody(safeBody)
    .setFooter(typeof card.footer === 'string' ? card.footer : '')

  const headerType = String(card.headerType || card.fileType || card.addHeader || '').toLowerCase()
  const headerOptions = card.headerOptions || {}
  const headerImage = card.image ||
    card.thumbnail ||
    card.thumbnailUrl ||
    card.thumbnail_url ||
    card.header?.image ||
    headerOptions.thumbnail ||
    headerOptions.image

  if (card.video || card.header?.video) {
    builder.setVideo(card.video || card.header.video, { mimetype: card.mimetype || 'video/mp4' })
  } else if (headerImage || ['png', 'jpg', 'jpeg', 'webp', 'image'].includes(headerType)) {
    let imageSource = headerImage || dummyPngBuffer()
    builder.setImage(imageSource, {
      mimetype: headerType === 'png'
        ? 'image/png'
        : headerType === 'webp'
          ? 'image/webp'
          : 'image/jpeg'
    })
  } else if (card.document || card.header?.document) {
    const doc = card.document || card.header.document
    if (Buffer.isBuffer(doc) || typeof doc === 'string') builder.setDocument(doc, card.documentOptions || {})
    else if (doc && typeof doc === 'object') builder.setDocument(doc.buffer || doc.url || Buffer.from(''), doc)
  } else if (headerType) {
    // Carousel WhatsApp lebih stabil dengan image/video header.
    // Untuk tipe file non-media, tetap fallback ke image dummy agar tidak menjadi unsupported.
    builder.setImage(headerImage || dummyPngBuffer(), { mimetype: 'image/png' })
  } else {
    builder.setImage(headerImage || dummyPngBuffer(), { mimetype: 'image/png' })
  }

  const offer = card.limitOffer || card.offer || card.limit_offer || options.limitOffer || null
  if (offer) builder.setLimitedOffer(offer)

  const buttons = card.buttons || card.interactiveButtons || []
  for (const rawButton of buttons) {
    const button = buildAuthorButton(rawButton)
    if (button) builder.addButton(button.name, button.buttonParamsJson)
  }

  if (!buttons.length && offer) {
    const normalized = normalizeLimitOfferInput(offer)
    builder.addButton('cta_url', {
      display_text: normalized?.text || carouselInvisibleText(),
      url: normalized?.url || '',
      merchant_url: normalized?.url || ''
    })
  }

  const built = await builder.toCard()

  // Card kosong total sering dianggap unsupported oleh WA. Pakai LRM agar tidak terlihat.
  if (!built.body || !carouselHasText(built.body.text || '')) {
    built.body = { text: carouselInvisibleText() }
  }

  return injectLimitedOfferToCard(built, offer)
}

class Carousel extends BaseBuilder {
  #client

  constructor(client) {
    super()
    if (!client) throw new Error('Socket is required')
    this.#client = client
    this._cards = []
  }

  addCard(card) {
    if (Array.isArray(card)) {
      this._cards.push(...card)
    } else {
      this._cards.push(card)
    }

    return this
  }

  build(jid, { ...options } = {}) {
    return generateWAMessageFromContent(
      jid,
      {
        ...this._extraPayload,
        interactiveMessage: {
          header: {
            hasMediaAttachment: false
          },
          body: { text: this._body },
          footer: { text: this._footer },
          contextInfo: this._contextInfo,
          carouselMessage: {
            cards: this._cards
          }
        }
      },
      { ...options }
    )
  }

  async send(jid, { ...options } = {}) {
    const msg = this.build(jid, options)

    await this.#client.relayMessage(msg.key.remoteJid, msg.message, {
      messageId: msg.key.id,
      additionalNodes: [
        {
          tag: 'biz',
          attrs: {},
          content: [
            {
              tag: 'interactive',
              attrs: { type: 'native_flow', v: '1' },
              content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
            }
          ]
        }
      ],
      ...options
    })

    return msg
  }
}

async function sendCarouselWithLimitOffer(sock, jid, content = {}, options = {}) {
  if (!sock) throw new Error('Socket is required')
  if (!content || !Array.isArray(content.cards) || !content.cards.length) {
    throw new Error('Carousel content with cards is required')
  }

  const carousel = new Carousel(sock)
    .setBody(typeof content.body === 'string' ? content.body : (typeof content.text === 'string' ? content.text : ''))
    .setFooter(typeof content.footer === 'string' ? content.footer : '')

  if (content.contextInfo || options.contextInfo) {
    carousel.setContextInfo({
      ...(content.contextInfo || {}),
      ...(options.contextInfo || {})
    })
  }

  for (const card of content.cards) {
    const builder = new Button(sock)
      .setTitle(typeof card.title === 'string' ? card.title : '')
      .setSubtitle(typeof card.subtitle === 'string' ? card.subtitle : '')
      .setBody(typeof card.body === 'string' ? card.body : (typeof card.text === 'string' ? card.text : ''))
      .setFooter(typeof card.footer === 'string' ? card.footer : '')

    const headerType = String(card.headerType || card.fileType || '').toLowerCase()
    const headerOptions = card.headerOptions || {}
    const imageSource =
      card.image ||
      card.thumbnail ||
      card.thumbnailUrl ||
      card.thumbnail_url ||
      card.header?.image ||
      headerOptions.thumbnail ||
      headerOptions.image

    const videoSource = card.video || card.header?.video || headerOptions.video
    const docSource = card.document || card.header?.document || headerOptions.document

    if (videoSource) {
      builder.setVideo(videoSource, {
        mimetype: card.mimetype || headerOptions.mimetype || 'video/mp4'
      })
    } else if (imageSource || ['png', 'jpg', 'jpeg', 'webp', 'image'].includes(headerType)) {
      builder.setImage(imageSource || dummyPngBuffer(), {
        mimetype:
          headerType === 'png'
            ? 'image/png'
            : headerType === 'webp'
              ? 'image/webp'
              : 'image/jpeg'
      })
    } else if (docSource) {
      if (Buffer.isBuffer(docSource) || typeof docSource === 'string') {
        builder.setDocument(docSource, card.documentOptions || headerOptions || {})
      } else if (docSource && typeof docSource === 'object') {
        builder.setDocument(docSource.buffer || docSource.url || Buffer.from(''), docSource)
      }
    } else {
      builder.setImage(dummyPngBuffer(), { mimetype: 'image/png' })
    }

    const offer = card.limitOffer || card.offer || card.limit_offer || options.limitOffer
    if (offer) builder.setLimitedOffer(offer)

    const buttons = card.buttons || card.interactiveButtons || []
    for (const rawButton of buttons) {
      const btn = buildAuthorButton(rawButton)
      if (btn) builder.addButton(btn.name, btn.buttonParamsJson)
    }

    // Limited offer but no explicit button: keep one URL button with the offer URL.
    // This follows the native-flow model; empty text uses a tiny invisible label.
    if (offer && !buttons.length) {
      const normalized = normalizeLimitOfferInput(offer)
      builder.addUrl(
        normalized?.text || '\u200e',
        normalized?.url || 'https://example.com',
        false
      )
    }

    carousel.addCard(await builder.toCard())
  }

  return carousel.send(jid, options)
}

const sendInteractiveCardLimitOffer = sendCarouselWithLimitOffer

class AIRich {
  #client

  constructor(client) {
    if (!client) throw new Error('Socket is required')
    this.#client = client
    this._title = ''
    this._submessages = []
    this._sections = []
    this._richResponseSources = []
  }

  setTitle(title) {
    if (typeof title !== 'string') throw new TypeError('Title must be a string')
    this._title = title
    return this
  }

  addText(text, { hyperlink = true, citation = true, latex = true } = {}) {
    if (typeof text !== 'string') throw new TypeError('Text must be a string')

    const extractedIE = extractIE(text, { hyperlink, citation, latex })

    const inline_entities = extractedIE.ie.map(({ type, ie }) => {
      if (type === 'hyperlink') {
        return {
          key: ie.key,
          metadata: {
            display_name: ie.text,
            is_trusted: true,
            url: ie.url,
            __typename: 'GenAIInlineLinkItem'
          }
        }
      }

      if (type === 'citation') {
        return {
          key: ie.key,
          metadata: {
            reference_id: ie.reference_id,
            reference_url: ie.url,
            reference_title: ie.url,
            reference_display_name: ie.url,
            sources: [],
            __typename: 'GenAISearchCitationItem'
          }
        }
      }

      if (type === 'latex') {
        return {
          key: ie.key,
          metadata: {
            latex_expression: ie.text,
            latex_image: {
              url: ie.url,
              width: Number(ie.width) || 100,
              height: Number(ie.height) || 100
            },
            font_height: Number(ie.font_height) || 83.333333333333,
            padding: Number(ie.padding) || 15,
            __typename: 'GenAILatexItem'
          }
        }
      }

      return {
        key: ie.key,
        metadata: {
          display_name: ie.text || '',
          url: ie.url || '',
          __typename: 'GenAIInlineLinkItem'
        }
      }
    })

    this._submessages.push({
      messageType: 2,
      messageText: extractedIE.text
    })

    this._sections.push({
      view_model: {
        primitive: {
          text: extractedIE.text,
          ...(inline_entities.length ? { inline_entities } : {}),
          __typename: 'GenAIMarkdownTextUXPrimitive'
        },
        __typename: 'GenAISingleLayoutViewModel'
      }
    })

    return this
  }

  addLatex(text, items = []) {
    if (typeof text !== 'string') throw new TypeError('Text must be a string')
    if (!Array.isArray(items)) throw new TypeError('Latex items must be an array')

    const inline_entities = items.map((item, index) => {
      const key = item.key || `LATEX_${index}`
      return {
        key,
        metadata: {
          latex_expression: item.expression || item.text || '',
          latex_image: {
            url: item.imageUrl || item.url || '',
            width: item.width || 1279,
            height: item.height || 825
          },
          font_height: item.fontHeight || item.font_height || 83.333333333333,
          padding: item.padding ?? 15,
          __typename: 'GenAILatexItem'
        }
      }
    })

    this._submessages.push({
      messageType: 2,
      messageText: text
    })

    this._sections.push({
      view_model: {
        primitive: {
          text,
          inline_entities,
          __typename: 'GenAIMarkdownTextUXPrimitive'
        },
        __typename: 'GenAISingleLayoutViewModel'
      }
    })

    return this
  }

  addCode(language, code) {
    if (typeof language !== 'string' || typeof code !== 'string') {
      throw new TypeError('Language and code must be a string')
    }

    const meta = AIRich.tokenizer(code, language)
    this._submessages.push({
      messageType: 5,
      codeMetadata: {
        codeLanguage: language,
        codeBlocks: meta.codeBlock
      }
    })

    this._sections.push({
      view_model: {
        primitive: {
          language,
          code_blocks: meta.unified_codeBlock,
          __typename: 'GenAICodeUXPrimitive'
        },
        __typename: 'GenAISingleLayoutViewModel'
      }
    })
    return this
  }

  addTable(table) {
    if (!Array.isArray(table)) throw new TypeError('Table must be an array')

    const meta = AIRich.toTableMetadata(table)
    this._submessages.push({
      messageType: 4,
      tableMetadata: {
        title: meta.title,
        rows: meta.rows
      }
    })

    this._sections.push({
      view_model: {
        primitive: {
          rows: meta.unified_rows,
          __typename: 'GenATableUXPrimitive'
        },
        __typename: 'GenAISingleLayoutViewModel'
      }
    })
    return this
  }

  addSource(sources = []) {
    if (!(Array.isArray(sources) && (sources.every((item) => typeof item === 'string') || sources.every((item) => Array.isArray(item) && item.every((v) => typeof v === 'string'))))) {
      throw new TypeError('Sources must be a string array or an array of string arrays')
    }

    if (sources.every((item) => typeof item === 'string')) sources = [sources]

    const source = sources.map(([profile_url, url, text]) => ({
      source_type: 'THIRD_PARTY',
      source_display_name: text ?? '',
      source_subtitle: 'AI',
      source_url: url ?? '',
      favicon: {
        url: profile_url ?? '',
        mime_type: 'image/jpeg',
        width: 16,
        height: 16
      }
    }))

    this._sections.push({
      view_model: {
        primitive: {
          sources: source,
          __typename: 'GenAISearchResultPrimitive'
        },
        __typename: 'GenAISingleLayoutViewModel'
      }
    })
    return this
  }

  addReels(reelsItems = []) {
    if (!((reelsItems && typeof reelsItems === 'object' && !Array.isArray(reelsItems)) || (Array.isArray(reelsItems) && reelsItems.every((item) => item && typeof item === 'object' && !Array.isArray(item))))) {
      throw new TypeError('Reels items must be an object or an array of objects')
    }

    if (!Array.isArray(reelsItems)) reelsItems = [reelsItems]

    this._submessages.push({
      messageType: 9,
      contentItemsMetadata: {
        contentType: 1,
        itemsMetadata: reelsItems.map((item) => ({
          reelItem: {
            title: item.title ?? '',
            profileIconUrl: item.profileIconUrl ?? '',
            thumbnailUrl: item.thumbnailUrl ?? '',
            videoUrl: item.videoUrl ?? ''
          }
        }))
      }
    })

    reelsItems.forEach((item, idx) => {
      this._richResponseSources.push({
        provider: 'NIXEL',
        thumbnailCDNURL: item.thumbnailUrl ?? '',
        sourceProviderURL: item.videoUrl ?? '',
        sourceQuery: '',
        faviconCDNURL: item.profileIconUrl ?? '',
        citationNumber: idx + 1,
        sourceTitle: item.title ?? ''
      })
    })

    this._sections.push({
      view_model: {
        primitives: reelsItems.map((item) => ({
          reels_url: item.videoUrl ?? '',
          thumbnail_url: item.thumbnailUrl ?? '',
          creator: item.title ?? '',
          avatar_url: item.profileIconUrl ?? '',
          reels_title: item.reels_title ?? '',
          likes_count: item.likes_count ?? 0,
          shares_count: item.shares_count ?? 0,
          view_count: item.view_count ?? 0,
          reel_source: item.reel_source ?? 'IG',
          is_verified: item.is_verified ?? false,
          __typename: 'GenAIReelPrimitive'
        })),
        __typename: 'GenAIHScrollLayoutViewModel'
      }
    })
    return this
  }

  addImage(imageUrl) {
    const defaultSourceUrl = String.fromCharCode(104, 116, 116, 112, 115, 58, 47, 47, 102, 105, 111, 114, 97, 46, 110, 105, 120, 101, 108, 46, 109, 121, 46, 105, 100, 47)
    const imageUrls = Array.isArray(imageUrl)
      ? imageUrl.map((url) => ({ imagePreviewUrl: url, imageHighResUrl: url, sourceUrl: defaultSourceUrl }))
      : [{ imagePreviewUrl: imageUrl, imageHighResUrl: imageUrl, sourceUrl: defaultSourceUrl }]

    this._submessages.push({
      messageType: 1,
      gridImageMetadata: {
        gridImageUrl: {
          imagePreviewUrl: Array.isArray(imageUrl) ? imageUrl[0] : imageUrl
        },
        imageUrls
      }
    })

    imageUrls.forEach(({ imagePreviewUrl }) => {
      this._sections.push({
        view_model: {
          primitive: {
            media: {
              url: imagePreviewUrl,
              mime_type: 'image/jpeg'
            },
            imagine_type: 3,
            status: { status: 'READY' },
            __typename: 'GenAIImaginePrimitive'
          },
          __typename: 'GenAISingleLayoutViewModel'
        }
      })
    })
    return this
  }

  build({ forwarded = true, includesUnifiedResponse = true, ...options } = {}) {
    const contextInfo = forwarded
      ? {
          forwardingScore: 1,
          isForwarded: true,
          forwardedAiBotMessageInfo: { botJid: '0@bot' },
          forwardOrigin: 4
        }
      : {}

    return {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
        botMetadata: {
          messageDisclaimerText: this._title,
          richResponseSourcesMetadata: { sources: this._richResponseSources }
        }
      },
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
            submessages: this._submessages,
            unifiedResponse: {
              data: includesUnifiedResponse
                ? Buffer.from(JSON.stringify({ response_id: crypto.randomUUID(), sections: this._sections })).toString('base64')
                : ''
            },
            contextInfo
          }
        }
      }
    }
  }

  async send(jid, { forwarded, includesUnifiedResponse, ...options } = {}) {
    const msg = this.build({ forwarded, includesUnifiedResponse, ...options })
    return await this.#client.relayMessage(jid, msg, { ...options })
  }

  static tokenizer(code, lang = 'javascript') {
    const keywordsMap = {
      javascript: new Set([
        'break', 'case', 'catch', 'continue', 'debugger', 'delete', 'do', 'else',
        'finally', 'for', 'function', 'if', 'in', 'instanceof', 'new', 'return',
        'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with',
        'true', 'false', 'null', 'undefined', 'class', 'const', 'let', 'super',
        'extends', 'export', 'import', 'yield', 'static', 'constructor', 'async',
        'await', 'get', 'set'
      ])
    }

    const TYPE_MAP = {
      0: 'DEFAULT',
      1: 'KEYWORD',
      2: 'METHOD',
      3: 'STR',
      4: 'NUMBER',
      5: 'COMMENT'
    }

    const keywords = keywordsMap[lang] || new Set()
    const tokens = []
    let i = 0

    const push = (content, type) => {
      if (!content) return
      const last = tokens[tokens.length - 1]
      if (last && last.highlightType === type) last.codeContent += content
      else tokens.push({ codeContent: content, highlightType: type })
    }

    while (i < code.length) {
      const c = code[i]

      if (/\s/.test(c)) {
        const s = i
        while (i < code.length && /\s/.test(code[i])) i++
        push(code.slice(s, i), 0)
        continue
      }

      if (c === '/' && code[i + 1] === '/') {
        const s = i
        i += 2
        while (i < code.length && code[i] !== '\n') i++
        push(code.slice(s, i), 5)
        continue
      }

      if (c === '"' || c === "'" || c === '`') {
        const s = i
        const q = c
        i++
        while (i < code.length) {
          if (code[i] === '\\' && i + 1 < code.length) i += 2
          else if (code[i] === q) {
            i++
            break
          } else i++
        }
        push(code.slice(s, i), 3)
        continue
      }

      if (/[0-9]/.test(c)) {
        const s = i
        while (i < code.length && /[0-9.]/.test(code[i])) i++
        push(code.slice(s, i), 4)
        continue
      }

      if (/[a-zA-Z_$]/.test(c)) {
        const s = i
        while (i < code.length && /[a-zA-Z0-9_$]/.test(code[i])) i++
        const word = code.slice(s, i)

        let type = 0
        if (keywords.has(word)) type = 1
        else {
          let j = i
          while (j < code.length && /\s/.test(code[j])) j++
          if (code[j] === '(') type = 2
        }

        push(word, type)
        continue
      }

      push(c, 0)
      i++
    }

    return {
      codeBlock: tokens,
      unified_codeBlock: tokens.map((t) => ({
        content: t.codeContent,
        type: TYPE_MAP[t.highlightType]
      }))
    }
  }

  static toTableMetadata(arr) {
    if (!Array.isArray(arr) || !arr.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string'))) {
      throw new TypeError('Table must be a nested array of strings')
    }

    const [header, ...rows] = arr
    const maxLen = Math.max(header.length, ...rows.map((r) => r.length))
    const normalize = (r) => [...r, ...Array(maxLen - r.length).fill('')]

    const unified_rows = [
      { is_header: true, cells: normalize(header) },
      ...rows.map((r) => ({ is_header: false, cells: normalize(r) }))
    ]

    const rowsMeta = unified_rows.map((r) => ({
      items: r.cells,
      ...(r.is_header ? { isHeading: true } : {})
    }))

    return { title: '', rows: rowsMeta, unified_rows }
  }
}



/* =========================
   Sticker Pack / NIXCODE
========================= */
const require = createRequire(import.meta.url)
const { Image } = webpmuxPkg
const archiver = archiverPkg?.default || archiverPkg
let __stickerPackAutoPatched = false

function readSafe(p) {
  try { return fs.readFileSync(p, 'utf8') } catch { return null }
}

function resolveBaileysRoot() {
  const tries = [
    'naileys/package.json',
    'baileys/package.json',
    '@whiskeysockets/baileys/package.json'
  ]

  const errors = []
  for (const target of tries) {
    try {
      const pkgJson = require.resolve(target)
      return { root: path.dirname(pkgJson), used: target }
    } catch (e) {
      errors.push({ target, err: String(e?.message || e) })
    }
  }

  return { root: null, used: null, errors }
}

function patchDefaultsCode(code) {
  let out = String(code || '')
  let changed = false

  if (!out.includes("'sticker-pack': '/mms/sticker-pack'")) {
    const next = out.replace(
      /sticker:\s*['"]\/mms\/image['"],\s*\n(\s*)['"]thumbnail-link['"]:/,
      match => match.replace(/\n(\s*)['"]thumbnail-link['"]:/, "\n$1'sticker-pack': '/mms/sticker-pack',\n$1'thumbnail-link':")
    )
    if (next !== out) {
      out = next
      changed = true
    }
  }

  if (!out.includes("'sticker-pack': 'Sticker Pack'")) {
    const next = out.replace(
      /sticker:\s*['"]Image['"],\s*\n(\s*)video:/,
      match => match.replace(/\n(\s*)video:/, "\n$1'sticker-pack': 'Sticker Pack',\n$1video:")
    )
    if (next !== out) {
      out = next
      changed = true
    }
  }

  return { code: out, changed }
}

function patchBaileysStickerPackMediaRc13_FORCE() {
  const resolved = resolveBaileysRoot()
  if (!resolved.root) {
    return {
      ok: false,
      reason: 'cannot resolve naileys package.json',
      tried: resolved.errors
    }
  }

  const candidates = [
    path.join(resolved.root, 'lib', 'Defaults', 'index.js'),
    path.join(resolved.root, 'lib', 'Defaults', 'index.mjs'),
    path.join(resolved.root, 'lib', 'Defaults', 'index.cjs')
  ].filter(p => fs.existsSync(p))

  if (!candidates.length) {
    return {
      ok: false,
      reason: 'defaults file not found',
      root: resolved.root,
      used: resolved.used
    }
  }

  const results = []

  for (const file of candidates) {
    const before = readSafe(file)
    if (!before) {
      results.push({ file, ok: false, reason: 'cannot read' })
      continue
    }

    const alreadyPatched =
      before.includes("'sticker-pack': '/mms/sticker-pack'") &&
      before.includes("'sticker-pack': 'Sticker Pack'")

    if (alreadyPatched) {
      results.push({ file, ok: true, changed: false, alreadyPatched: true })
      continue
    }

    const patched = patchDefaultsCode(before)
    if (!patched.changed) {
      results.push({ file, ok: false, reason: 'pattern not found' })
      continue
    }

    fs.writeFileSync(file, patched.code, 'utf8')

    const after = readSafe(file) || ''
    const ok =
      after.includes("'sticker-pack': '/mms/sticker-pack'") &&
      after.includes("'sticker-pack': 'Sticker Pack'")

    results.push({ file, ok, changed: true, alreadyPatched: false })
  }

  return {
    ok: results.some(r => r.ok),
    used: resolved.used,
    root: resolved.root,
    results
  }
}

function autoPatchBaileysStickerPackMediaRc13_FORCE() {
  if (__stickerPackAutoPatched) return { ok: true, skipped: true, reason: 'already attempted' }
  __stickerPackAutoPatched = true
  try {
    return patchBaileysStickerPackMediaRc13_FORCE()
  } catch (e) {
    return { ok: false, reason: String(e?.message || e) }
  }
}


const execFileAsync = promisify(execFile)
const STICKER_PACK_MAX_ITEMS = 30

function tmpFile(ext = '') {
  return path.join(
    os.tmpdir(),
    `natass-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`
  )
}

async function streamToBuffer(stream) {
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

function normalizeTrigger(input) {
  const s = String(input || '').trim()
  if (!s) return ''
  if (s.startsWith('.') || s.startsWith('#') || s.startsWith('/')) return s
  return '.' + s
}

async function ffmpegConvert(inputPath, outputPath, extraArgs = []) {
  const args = [
    '-y',
    '-i', inputPath,
    ...extraArgs,
    outputPath
  ]
  await execFileAsync('ffmpeg', args)
}

async function imageToWebp(buffer) {
  const input = tmpFile('.jpg')
  const output = tmpFile('.webp')

  try {
    fs.writeFileSync(input, buffer)

    await ffmpegConvert(input, output, [
      '-vf',
      "scale=512:512:force_original_aspect_ratio=increase,crop=512:512",
      '-vcodec', 'libwebp',
      '-lossless', '0',
      '-q:v', '75',
      '-preset', 'picture',
      '-loop', '0',
      '-an',
      '-vsync', '0'
    ])

    return fs.readFileSync(output)
  } finally {
    if (fs.existsSync(input)) fs.unlinkSync(input)
    if (fs.existsSync(output)) fs.unlinkSync(output)
  }
}

async function videoToWebp(buffer) {
  const input = tmpFile('.mp4')
  const output = tmpFile('.webp')

  try {
    fs.writeFileSync(input, buffer)

    await ffmpegConvert(input, output, [
      '-ss', '0',
      '-t', '8',
      '-vf',
      "fps=15,scale=512:512:force_original_aspect_ratio=increase,crop=512:512:exact=1",
      '-vcodec', 'libwebp_anim',
      '-loop', '0',
      '-an',
      '-preset', 'default',
      '-vsync', '0'
    ])

    return fs.readFileSync(output)
  } finally {
    if (fs.existsSync(input)) fs.unlinkSync(input)
    if (fs.existsSync(output)) fs.unlinkSync(output)
  }
}

async function writeWebpExifJson(webpBuffer, jsonObj) {
  const img = new Image()
  await img.load(webpBuffer)

  const json = JSON.stringify(jsonObj || {})
  const exifAttr = Buffer.concat([
    Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00]),
    Buffer.from(json, 'utf-8')
  ])

  img.exif = exifAttr
  return await img.save(null)
}

async function writeExif(webpBuffer, wm = {}, extra = {}) {
  const exifJson = (await readWebpExifJson(webpBuffer)) || {}

  const packname = wm?.packname
    ? String(wm.packname)
    : (exifJson['sticker-pack-name'] || exifJson.packname || 'Sticker')

  const author = wm?.author
    ? String(wm.author)
    : (exifJson['sticker-pack-publisher'] || exifJson.author || '')

  exifJson['sticker-pack-name'] = packname
  exifJson['sticker-pack-publisher'] = author
  exifJson.packname = packname
  exifJson.author = author

  if (Array.isArray(extra.emojis)) {
    exifJson.emojis = extra.emojis
  }

  if (extra.trigger) {
    exifJson.natass = exifJson.natass && typeof exifJson.natass === 'object'
      ? exifJson.natass
      : {}
    exifJson.natass.trigger = normalizeTrigger(extra.trigger)
    exifJson.trigger = normalizeTrigger(extra.trigger)
  }

  return await writeWebpExifJson(webpBuffer, exifJson)
}

async function writeExifImg(buffer, wm = {}, extra = {}) {
  const webp = await imageToWebp(buffer)
  return writeExif(webp, wm, extra)
}

async function writeExifVid(buffer, wm = {}, extra = {}) {
  const webp = await videoToWebp(buffer)
  return writeExif(webp, wm, extra)
}

async function getStickerTriggerFromMessage(m) {
  const msg = m?.message || {}
  const sticker =
    msg?.stickerMessage ||
    msg?.ephemeralMessage?.message?.stickerMessage ||
    msg?.viewOnceMessage?.message?.stickerMessage ||
    msg?.viewOnceMessageV2?.message?.stickerMessage ||
    msg?.viewOnceMessageV2Extension?.message?.stickerMessage

  if (!sticker) return ''

  const stream = await downloadContentFromMessage(sticker, 'sticker')
  const webpBuffer = await streamToBuffer(stream)

  const exifJson = await readWebpExifJson(webpBuffer)
  if (!exifJson) return ''

  const trig = exifJson?.natass?.trigger || exifJson?.trigger || ''
  return normalizeTrigger(trig)
}

async function setStickerTrigger(webpBuffer, trigger, wm = {}) {
  const trig = normalizeTrigger(trigger)
  if (!trig) return webpBuffer

  const exifJson = (await readWebpExifJson(webpBuffer)) || {}

  const packname = wm?.packname
    ? String(wm.packname)
    : (exifJson['sticker-pack-name'] || exifJson.packname || 'Sticker')

  const author = wm?.author
    ? String(wm.author)
    : (exifJson['sticker-pack-publisher'] || exifJson.author || '')

  exifJson['sticker-pack-name'] = packname
  exifJson['sticker-pack-publisher'] = author
  exifJson.packname = packname
  exifJson.author = author

  exifJson.natass = exifJson.natass && typeof exifJson.natass === 'object'
    ? exifJson.natass
    : {}
  exifJson.natass.trigger = trig
  exifJson.trigger = trig

  return await writeWebpExifJson(webpBuffer, exifJson)
}

async function updateStickerWmOnly(webpBuffer, wm = {}) {
  const exifJson = (await readWebpExifJson(webpBuffer)) || {}

  const packname = wm?.packname
    ? String(wm.packname)
    : (exifJson['sticker-pack-name'] || exifJson.packname || 'Sticker')

  const author = wm?.author
    ? String(wm.author)
    : (exifJson['sticker-pack-publisher'] || exifJson.author || '')

  exifJson['sticker-pack-name'] = packname
  exifJson['sticker-pack-publisher'] = author
  exifJson.packname = packname
  exifJson.author = author

  return await writeWebpExifJson(webpBuffer, exifJson)
}

/* =========================
   Album helpers
========================= */

function detectAlbumMessage(target) {
  const msg = target?.message || target || {}

  if (msg?.albumMessage) return true
  if (msg?.ephemeralMessage?.message?.albumMessage) return true
  if (msg?.viewOnceMessage?.message?.albumMessage) return true
  if (msg?.viewOnceMessageV2?.message?.albumMessage) return true

  if (target?.type === 'albumMessage') return true
  if (target?.raw?.albumMessage) return true

  return false
}

function isAlbumReply(m) {
  const q = m?.quoted
  if (!q) return false
  return detectAlbumMessage(q)
}

function getAlbumKeyInfo(m) {
  const q = m?.quoted
  if (!q) return null

  return {
    stanzaId: q?.quotedMeta?.stanzaId || q?.key?.id || null,
    participant: q?.quotedMeta?.participant || q?.key?.participant || q?.sender || null,
    remoteJid: q?.quotedMeta?.remoteJid || q?.key?.remoteJid || null
  }
}

/* =========================
   Sticker Pack helpers
========================= */

function ensureStickerPackSock(sock) {
  if (!sock) throw new Error('sock is required')
  if (typeof sock.relayMessage !== 'function') throw new Error('sock.relayMessage is required')
  return sock
}

function normalizeStickerPackInput(input = {}) {
  const src = input?.stickerPack && typeof input.stickerPack === 'object'
    ? input.stickerPack
    : input

  const packname = String(
    src?.packname ||
    src?.name ||
    src?.title ||
    'Sticker Pack'
  ).trim() || 'Sticker Pack'

  const author = String(
    src?.author ||
    src?.publisher ||
    ''
  ).trim()

  const caption = src?.caption ? String(src.caption) : ''
  const packDescription = src?.packDescription ? String(src.packDescription) : (src?.description ? String(src.description) : '')

  const stickers = Array.isArray(src?.stickers)
    ? src.stickers.filter(Boolean)
    : []

  return {
    ...src,
    packname,
    author,
    caption,
    packDescription,
    cover: src?.cover || src?.thumbnail || null,
    stickerPackOrigin: src?.stickerPackOrigin,
    stickers
  }
}

function isAnimatedWebp(buffer) {
  try {
    if (!Buffer.isBuffer(buffer) || buffer.length < 16) return false
    const riff = buffer.subarray(0, 4).toString('ascii')
    const webp = buffer.subarray(8, 12).toString('ascii')
    if (riff !== 'RIFF' || webp !== 'WEBP') return false
    const ascii = buffer.toString('ascii')
    if (ascii.includes('ANMF') || ascii.includes('ANIM')) return true
    const vp8xPos = ascii.indexOf('VP8X')
    if (vp8xPos >= 0 && buffer.length >= vp8xPos + 9) {
      const flags = buffer[vp8xPos + 8]
      return (flags & 0x02) === 0x02
    }
  } catch {}
  return false
}

function toBufferBytes(value) {
  if (!value) return undefined
  if (Buffer.isBuffer(value)) return value
  if (value instanceof Uint8Array) return Buffer.from(value)
  if (Array.isArray(value)) return Buffer.from(value)
  if (typeof value === 'string') {
    try { return Buffer.from(value, 'base64') } catch {}
  }
  return undefined
}

function normalizeEmojiList(value) {
  if (!Array.isArray(value)) return ['']
  const out = value.map(v => String(v || '').trim()).filter(Boolean)
  return out.length ? out : ['']
}

function randomStickerFileName(ext = '.webp') {
  return `sticker-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`
}

function detectBufferKind(buffer = Buffer.alloc(0)) {
  if (!Buffer.isBuffer(buffer)) return 'unknown'
  if (buffer.length >= 12) {
    const riff = buffer.subarray(0, 4).toString('ascii')
    const webp = buffer.subarray(8, 12).toString('ascii')
    if (riff === 'RIFF' && webp === 'WEBP') return 'webp'
  }
  if (buffer.length >= 8) {
    const pngSig = '89504e470d0a1a0a'
    if (buffer.subarray(0, 8).toString('hex') === pngSig) return 'png'
  }
  if (buffer.length >= 3) {
    const jpg = buffer.subarray(0, 3).toString('hex')
    if (jpg === 'ffd8ff') return 'jpeg'
  }
  if (buffer.length >= 6) {
    const head6 = buffer.subarray(0, 6).toString('ascii')
    if (head6 === 'GIF87a' || head6 === 'GIF89a') return 'gif'
  }
  if (buffer.length >= 12) {
    const brand = buffer.subarray(4, 12).toString('ascii')
    if (brand.includes('ftyp')) return 'video'
  }
  if (buffer.length >= 2) {
    const gz = buffer.subarray(0, 2).toString('hex')
    if (gz === '1f8b') return 'tgs'
  }
  return 'unknown'
}

function guessSourceExt(source = {}) {
  const candidates = [source?.fileName, source?.path, source?.url]
    .filter(Boolean)
    .map(v => String(v).toLowerCase())

  for (const value of candidates) {
    const clean = value.split('?')[0].split('#')[0]
    const m = clean.match(/\.([a-z0-9]+)$/i)
    if (m?.[1]) return '.' + m[1].toLowerCase()
  }

  return ''
}

function makeStickerPackItemName(buffer, index = 0, ext = '.webp') {
  const hashB64 = crypto.createHash('sha256').update(buffer).digest('base64')
  return `${String(index).padStart(2, '0')}_${encodeURIComponent(hashB64)}${ext}`
}

function toHexSha256(buffer) {
  if (!buffer) return ''
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function toB64(value) {
  if (!value) return ''
  if (Buffer.isBuffer(value)) return value.toString('base64')
  if (value instanceof Uint8Array) return Buffer.from(value).toString('base64')
  if (Array.isArray(value)) return Buffer.from(value).toString('base64')
  return String(value)
}

async function bufferToWebpWithHint(buffer, extHint = '.bin', animated = false) {
  const input = tmpFile(extHint || '.bin')
  const output = tmpFile('.webp')

  try {
    fs.writeFileSync(input, buffer)

    if (animated) {
      await ffmpegConvert(input, output, [
        '-ss', '0',
        '-t', '8',
        '-vf',
        "fps=15,scale=512:512:force_original_aspect_ratio=increase,crop=512:512:exact=1",
        '-vcodec', 'libwebp_anim',
        '-loop', '0',
        '-an',
        '-preset', 'default',
        '-vsync', '0'
      ])
    } else {
      await ffmpegConvert(input, output, [
        '-vf',
        "scale=512:512:force_original_aspect_ratio=increase,crop=512:512",
        '-vcodec', 'libwebp',
        '-lossless', '0',
        '-q:v', '75',
        '-preset', 'picture',
        '-loop', '0',
        '-an',
        '-vsync', '0'
      ])
    }

    return fs.readFileSync(output)
  } finally {
    try { if (fs.existsSync(input)) fs.unlinkSync(input) } catch {}
    try { if (fs.existsSync(output)) fs.unlinkSync(output) } catch {}
  }
}

async function fetchStickerSourceBuffer(item) {
  if (Buffer.isBuffer(item)) return Buffer.from(item)
  if (item instanceof Uint8Array) return Buffer.from(item)
  if (typeof item === 'string') {
    const url = String(item).trim()
    if (/^https?:\/\//i.test(url)) {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    }
    if (fs.existsSync(url)) return fs.readFileSync(url)
  }
  if (item && typeof item === 'object') {
    if (Buffer.isBuffer(item.buffer)) return Buffer.from(item.buffer)
    if (item.buffer instanceof Uint8Array) return Buffer.from(item.buffer)
    if (Buffer.isBuffer(item.data)) return Buffer.from(item.data)
    if (item.data instanceof Uint8Array) return Buffer.from(item.data)
    if (typeof item.url === 'string' && /^https?:\/\//i.test(item.url)) {
      const res = await fetch(item.url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    }
    if (typeof item.url === 'string' && fs.existsSync(item.url)) {
      return fs.readFileSync(item.url)
    }
    if (typeof item.path === 'string' && fs.existsSync(item.path)) {
      return fs.readFileSync(item.path)
    }
  }
  throw new Error('Sticker source tidak didukung. Gunakan url, path, buffer, atau Uint8Array.')
}

async function normalizeStickerEntry(item, index = 0) {
  const source = item && typeof item === 'object' ? item : { url: typeof item === 'string' ? item : '' }
  const inputBuffer = await fetchStickerSourceBuffer(item)
  const extHint = guessSourceExt(source) || '.bin'
  const detected = detectBufferKind(inputBuffer)
  const forceAnimated = Boolean(source?.isAnimated)
  const isLottie = Boolean(source?.isLottie) || detected === 'tgs' || /tgs/i.test(String(source?.mimetype || ''))
  const accessibilityLabel = source?.accessibilityLabel ? String(source.accessibilityLabel) : ''

  let buffer = inputBuffer
  let mimetype = 'image/webp'
  let isAnimated = false
  let fileExt = '.webp'

  if (isLottie) {
    mimetype = 'application/x-tgsticker'
    isAnimated = true
    fileExt = '.tgs'
  } else if (detected === 'webp') {
    buffer = inputBuffer
    isAnimated = isAnimatedWebp(buffer)
    mimetype = 'image/webp'
  } else if (detected === 'gif' || detected === 'video' || forceAnimated) {
    buffer = await bufferToWebpWithHint(inputBuffer, extHint, true)
    isAnimated = true
    mimetype = 'image/webp'
  } else {
    buffer = await bufferToWebpWithHint(inputBuffer, extHint, false)
    isAnimated = false
    mimetype = 'image/webp'
  }

  const fileName = String(
    source?.fileName ||
    makeStickerPackItemName(buffer, index, fileExt) ||
    randomStickerFileName(fileExt)
  )

  return {
    index,
    buffer,
    fileName,
    isAnimated,
    isLottie,
    mimetype,
    emojis: normalizeEmojiList(source?.emojis),
    accessibilityLabel
  }
}

async function buildStickerPackThumbnail(stickerBuffer) {
  const png = await sharp(stickerBuffer, { animated: true, pages: 1 })
    .resize(96, 96, { fit: 'cover' })
    .png()
    .toBuffer()
  return {
    buffer: png,
    width: 96,
    height: 96
  }
}

async function buildStickerPackZip(entries = [], trayThumb = null) {
  return await new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } })
    const chunks = []

    archive.on('warning', (err) => {
      if (err?.code === 'ENOENT') return
      reject(err)
    })
    archive.on('error', reject)
    archive.on('data', (chunk) => chunks.push(chunk))
    archive.on('end', () => resolve(Buffer.concat(chunks)))

    for (const entry of entries) {
      archive.append(entry.buffer, { name: entry.fileName })
    }

    if (trayThumb?.buffer) {
      archive.append(trayThumb.buffer, { name: 'tray.png' })
    }

    archive.finalize().catch(reject)
  })
}

function extractUploadedMessage(media = {}) {
  return (
    media?.imageMessage ||
    media?.documentMessage ||
    media?.videoMessage ||
    media?.audioMessage ||
    media?.stickerMessage ||
    media?.message?.imageMessage ||
    media?.message?.documentMessage ||
    media?.message?.videoMessage ||
    media?.message?.audioMessage ||
    media?.message?.stickerMessage ||
    null
  )
}

async function uploadStickerPackBlob(buffer, ctx = {}, fileName = 'sticker-pack.zip') {
  const upload = ctx?.upload || ctx?.sock?.waUploadToServer
  if (typeof upload !== 'function') {
    throw new Error('upload/waUploadToServer tidak tersedia untuk sticker pack')
  }

  const {
    mediaKey,
    encFilePath,
    originalFilePath,
    fileEncSha256,
    fileSha256,
    fileLength
  } = await encryptedStream(buffer, 'sticker-pack', {
    logger: ctx?.logger,
    saveOriginalFileIfRequired: false,
    opts: ctx?.options
  })

  try {
    const uploaded = await upload(encFilePath, {
      mediaType: 'sticker-pack',
      fileEncSha256B64: toB64(fileEncSha256),
      timeoutMs: ctx?.mediaUploadTimeoutMs
    })

    return {
      url: uploaded?.mediaUrl || uploaded?.url || '',
      directPath: uploaded?.directPath || uploaded?.direct_path || '',
      handle: uploaded?.handle,
      mediaKey,
      fileEncSha256,
      fileSha256,
      fileLength,
      fileName,
      mediaKeyTimestamp: Math.floor(Date.now() / 1000)
    }
  } finally {
    try { if (encFilePath && fs.existsSync(encFilePath)) fs.unlinkSync(encFilePath) } catch {}
    try { if (originalFilePath && fs.existsSync(originalFilePath)) fs.unlinkSync(originalFilePath) } catch {}
  }
}

function createStickerPackProto(payload = {}) {
  return proto.Message.StickerPackMessage.fromObject(payload)
}

async function buildSingleStickerPackMessage(stickerPack, ctx = {}) {
  const upload = ctx?.upload || ctx?.sock?.waUploadToServer
  if (typeof upload !== 'function') {
    throw new Error('upload/waUploadToServer tidak tersedia untuk sticker pack')
  }

  const normalized = normalizeStickerPackInput(stickerPack)
  if (!normalized.stickers.length) {
    throw new Error('Sticker pack minimal memiliki 1 sticker')
  }

  const entries = []
  for (let i = 0; i < normalized.stickers.length; i += 1) {
    entries.push(await normalizeStickerEntry(normalized.stickers[i], i))
  }

  const coverSource = normalized.cover || entries[0].buffer
  const coverBuffer = await fetchStickerSourceBuffer(coverSource).catch(() => entries[0].buffer)
  const trayThumb = await buildStickerPackThumbnail(coverBuffer)
  const zipBuffer = await buildStickerPackZip(entries, trayThumb)
  const stickerPackId = normalized.stickerPackId || `com.natasssbotzz.stickercontentprovider ${crypto.randomUUID()}`

  const packMedia = await uploadStickerPackBlob(
    zipBuffer,
    {
      ...ctx,
      upload,
      sock: ctx?.sock
    },
    `${stickerPackId}.zip`
  )

  const thumbMedia = extractUploadedMessage(await prepareWAMessageMedia(
    { image: trayThumb.buffer },
    {
      upload,
      mediaUploadTimeoutMs: ctx?.mediaUploadTimeoutMs,
      logger: ctx?.logger,
      options: ctx?.options
    }
  ))

  const payload = {
    stickerPackId,
    name: normalized.packname,
    publisher: normalized.author,
    stickers: entries.map((entry) => ({
      fileName: entry.fileName,
      isAnimated: entry.isAnimated,
      emojis: entry.emojis,
      accessibilityLabel: entry.accessibilityLabel,
      isLottie: entry.isLottie,
      mimetype: entry.mimetype
    })),
    fileLength: packMedia?.fileLength || zipBuffer.length,
    fileSha256: toBufferBytes(packMedia?.fileSha256) || crypto.randomBytes(32),
    fileEncSha256: toBufferBytes(packMedia?.fileEncSha256) || crypto.randomBytes(32),
    mediaKey: toBufferBytes(packMedia?.mediaKey) || crypto.randomBytes(32),
    directPath: packMedia?.directPath || '',
    caption: normalized.caption || '',
    contextInfo: normalized.contextInfo || {},
    packDescription: normalized.packDescription || '',
    mediaKeyTimestamp: packMedia?.mediaKeyTimestamp || Math.floor(Date.now() / 1000),
    trayIconFileName: `${stickerPackId}.png`,
    thumbnailDirectPath: thumbMedia?.directPath || '',
    thumbnailSha256: toBufferBytes(thumbMedia?.fileSha256) || crypto.randomBytes(32),
    thumbnailEncSha256: toBufferBytes(thumbMedia?.fileEncSha256) || crypto.randomBytes(32),
    thumbnailHeight: Number(thumbMedia?.height || trayThumb.height || 96),
    thumbnailWidth: Number(thumbMedia?.width || trayThumb.width || 96),
    imageDataHash: toHexSha256(trayThumb.buffer),
    stickerPackSize: zipBuffer.length,
    stickerPackOrigin: Number.isFinite(Number(normalized.stickerPackOrigin))
      ? Number(normalized.stickerPackOrigin)
      : 1
  }

  const stickerPackMessage = createStickerPackProto(payload)

  return {
    stickerPackMessage,
    meta: {
      stickerPackId,
      zipBuffer,
      trayThumb,
      entries,
      uploadedPack: packMedia,
      uploadedThumb: thumbMedia
    }
  }
}

async function prepareStickerPackMessage(arg1, arg2 = {}, arg3 = {}) {
  const usingSockFirst = arg1 && typeof arg1 === 'object' && (
    typeof arg1.waUploadToServer === 'function' ||
    typeof arg1.relayMessage === 'function' ||
    typeof arg1.sendMessage === 'function'
  )

  const sock = usingSockFirst ? arg1 : arg2?.sock
  const stickerPack = usingSockFirst ? arg2 : arg1
  const ctx = usingSockFirst ? (arg3 || {}) : (arg2 || {})

  const normalized = normalizeStickerPackInput(stickerPack)
  if (!normalized.stickers.length) {
    throw new Error('Sticker pack minimal memiliki 1 sticker')
  }

  const chunks = []
  for (let i = 0; i < normalized.stickers.length; i += STICKER_PACK_MAX_ITEMS) {
    chunks.push(normalized.stickers.slice(i, i + STICKER_PACK_MAX_ITEMS))
  }

  const prepared = []
  for (let i = 0; i < chunks.length; i += 1) {
    const suffix = chunks.length > 1 ? ` (${i + 1}/${chunks.length})` : ''
    const single = await buildSingleStickerPackMessage(
      {
        ...normalized,
        packname: `${normalized.packname}${suffix}`,
        stickers: chunks[i]
      },
      {
        ...ctx,
        sock,
        upload: ctx?.upload || sock?.waUploadToServer
      }
    )
    prepared.push(single)
  }

  if (prepared.length === 1) {
    return {
      isBatched: false,
      stickerPackMessage: prepared[0].stickerPackMessage,
      meta: prepared[0].meta
    }
  }

  return {
    isBatched: true,
    stickerPackMessage: prepared.map(item => item.stickerPackMessage),
    meta: prepared.map(item => item.meta)
  }
}

async function sendStickerPack(sock, jid, stickerPack, options = {}) {
  sock = ensureStickerPackSock(sock)

  const prepared = await prepareStickerPackMessage(sock, stickerPack, {
    ...options,
    upload: options?.upload || sock?.waUploadToServer
  })

  const userJid = (
    options?.userJid ||
    sock?.user?.id ||
    sock?.authState?.creds?.me?.id ||
    '0@s.whatsapp.net'
  )

  const sendSingle = async (payload) => {
    const msg = generateWAMessageFromContent(
      jid,
      { stickerPackMessage: payload },
      {
        userJid,
        quoted: options?.quoted,
        timestamp: options?.timestamp,
        ephemeralExpiration: options?.ephemeralExpiration,
        messageId: options?.messageId
      }
    )

    await sock.relayMessage(jid, msg.message, {
      messageId: msg.key.id,
      useCachedGroupMetadata: options?.useCachedGroupMetadata,
      additionalAttributes: options?.additionalAttributes,
      additionalNodes: options?.additionalNodes,
      statusJidList: options?.statusJidList
    })

    return msg
  }

  if (prepared.isBatched) {
    let lastMsg = null
    for (let i = 0; i < prepared.stickerPackMessage.length; i += 1) {
      lastMsg = await sendSingle(prepared.stickerPackMessage[i])
      if (i < prepared.stickerPackMessage.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 700))
      }
    }
    return lastMsg
  }

  return sendSingle(prepared.stickerPackMessage)
}

function patchSocketStickerPack(sock) {
  if (!sock || sock.__stickerPackPatched) return sock

  const originalSendMessage = typeof sock.sendMessage === 'function'
    ? sock.sendMessage.bind(sock)
    : null

  sock.sendStickerPack = async (jid, stickerPack, options = {}) => {
    return sendStickerPack(sock, jid, stickerPack, options)
  }

  sock.prepareStickerPackMessage = async (stickerPack, options = {}) => {
    return prepareStickerPackMessage(sock, stickerPack, options)
  }

  if (originalSendMessage) {
    sock.sendMessage = async (jid, content = {}, options = {}) => {
      if (
        content &&
        typeof content === 'object' &&
        !content.stickerPackMessage &&
        Object.prototype.hasOwnProperty.call(content, 'stickerPack')
      ) {
        return sock.sendStickerPack(jid, content.stickerPack, options)
      }
      return originalSendMessage(jid, content, options)
    }
  }

  sock.__stickerPackPatched = true
  return sock
}

function makeStickerHelper(sock) {
  patchSocketStickerPack(sock)
  return {
    send: (jid, stickerPack, options = {}) => sendStickerPack(sock, jid, stickerPack, options),
    prepare: (stickerPack, options = {}) => prepareStickerPackMessage(sock, stickerPack, options),
    patch: () => patchSocketStickerPack(sock),
    normalizeInput: (input) => normalizeStickerPackInput(input)
  }
}


const STICKER_PACK_LINK_THUMB_B64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9k="

function randomStickerPackLinkId() {
  return crypto.randomBytes(10).toString('hex').toUpperCase()
}

async function sendStickerPackLink(sock, jid, code = 'XOXO', options = {}) {
  const packCode = String(code || 'XOXO').trim() || 'XOXO'
  const link = `https://wa.me/stickerpack/${encodeURIComponent(packCode)}`
  const thumb = options.thumbnail || Buffer.from(STICKER_PACK_LINK_THUMB_B64, 'base64')
  const msg = {
    extendedTextMessage: {
      text: link,
      matchedText: link,
      title: options.title || `Paket Stiker ${packCode} di WhatsApp`,
      description: options.description || 'Sticker pack link preview',
      previewType: 'NONE',
      jpegThumbnail: thumb,
      inviteLinkGroupTypeV2: 'DEFAULT'
    }
  }
  await sock.relayMessage(jid, msg, { messageId: options.messageId || randomStickerPackLinkId() })
  return msg
}


class StickerPack extends BaseBuilder {
  #client

  constructor(client) {
    super()
    if (!client) throw new Error('Socket is required')
    this.#client = client
    this._pack = {
      packname: 'Sticker Pack',
      author: '',
      description: '',
      caption: '',
      cover: null,
      stickers: []
    }
  }

  setPackName(name = 'Sticker Pack') {
    this._pack.packname = String(name || 'Sticker Pack')
    this._pack.name = this._pack.packname
    return this
  }

  setPackname(name = 'Sticker Pack') { return this.setPackName(name) }
  setName(name = 'Sticker Pack') { return this.setPackName(name) }

  setAuthor(author = '') {
    this._pack.author = String(author || '')
    this._pack.publisher = this._pack.author
    return this
  }

  setPublisher(author = '') { return this.setAuthor(author) }

  setDescription(description = '') {
    this._pack.description = String(description || '')
    this._pack.packDescription = this._pack.description
    return this
  }

  setCaption(caption = '') {
    this._pack.caption = String(caption || '')
    return this
  }

  setCover(cover = null) {
    this._pack.cover = cover
    return this
  }

  setThumbnail(thumbnail = null) { return this.setCover(thumbnail) }

  addSticker(input, options = {}) {
    if (!input && !options?.url && !options?.buffer && !options?.data && !options?.path) {
      throw new Error('Sticker source is required')
    }

    const sticker = input && typeof input === 'object' && !Buffer.isBuffer(input) && !(input instanceof Uint8Array)
      ? { ...input, ...options }
      : {
          ...options,
          url: typeof input === 'string' ? input : options.url,
          buffer: Buffer.isBuffer(input) || input instanceof Uint8Array ? input : options.buffer
        }

    this._pack.stickers.push(sticker)
    return this
  }

  addStickers(stickers = []) {
    if (!Array.isArray(stickers)) throw new TypeError('Stickers must be an array')
    for (const sticker of stickers) this.addSticker(sticker)
    return this
  }

  setStickers(stickers = []) {
    this._pack.stickers = []
    return this.addStickers(stickers)
  }

  addImage(input, options = {}) { return this.addSticker(input, { ...options, isAnimated: false }) }
  addVideo(input, options = {}) { return this.addSticker(input, { ...options, isAnimated: true }) }
  addAnimated(input, options = {}) { return this.addSticker(input, { ...options, isAnimated: true }) }

  setOrigin(value = 1) {
    this._pack.stickerPackOrigin = Number(value) || 1
    return this
  }

  toJSON() { return { ...this._pack } }
  async prepare(options = {}) { return await prepareStickerPackMessage(this.#client, this.toJSON(), options) }
  async send(jid, options = {}) { return await sendStickerPack(this.#client, jid, this.toJSON(), options) }
}


const Message = Button
const NativeButton = Button

export {
  VERSION,
  NIXCODE_VERSION,
  Message,
  NativeButton,
  Button,
  ButtonV2,
  Carousel,
  AIRich,
  sendButtons,
  StickerPack,
  imageToWebp,
  videoToWebp,
  writeExif,
  writeExifImg,
  writeExifVid,
  getStickerTriggerFromMessage,
  setStickerTrigger,
  updateStickerWmOnly,
  detectAlbumMessage,
  isAlbumReply,
  getAlbumKeyInfo,
  prepareStickerPackMessage,
  sendStickerPack,
  patchSocketStickerPack,
  makeStickerHelper,
  sendStickerPackLink,
  patchBaileysStickerPackMediaRc13_FORCE,
  autoPatchBaileysStickerPackMediaRc13_FORCE,
  Swgc,
  patchBaileysForSwgc,
  patchSocketSwgc,
  sendSwgc,
  createStatusPayloadFromInput,
  payloadToStatusContent,
  sendPayloadToGroupStatus,
  groupStatus,
  notifySwgcEcho,
  waitForSwgcEcho,
  hasGroupStatusEnvelope,
  buildGroupList,
  makeGroupListText,
  resolveGroupTarget,
  splitTargetAndContent,
  isGroupAdmin,
  getBodyText,
  normalizeLimitOfferInput,
  buildLimitedOfferParam,
  sendCarouselWithLimitOffer,
  sendInteractiveCardLimitOffer,
  buildBookingConfirmationParams
}
