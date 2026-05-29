import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import crypto from 'crypto'
import { proto } from '../../WAProto/index.js'
import { generateMessageID } from './generics.js'
import { generateWAMessageFromContent, prepareWAMessageMedia, downloadMediaMessage } from './messages.js'
import { decryptMessageNode } from './decode-wa-message.js'
import { generateProfilePicture } from './messages-media.js'
import {
  S_WHATSAPP_NET,
  getBinaryNodeChild,
  getBinaryNodeChildren,
  getAllBinaryNodeChildren
} from '../WABinary/index.js'

const ownerChannelLink = process.env.OWNER_CHANNEL_LINK || ''
const ownerChannelJid = process.env.OWNER_CHANNEL_JID || ''
const ownerChannelId = process.env.OWNER_CHANNEL_ID || ''
const defaultPrefix = process.env.PREFIX || '.'

export const NEWSLETTER_QUERY_IDS = {
  JOB_MUTATION: '7150902998257522',
  METADATA: '6620195908089573',
  UNFOLLOW: '7238632346214362',
  FOLLOW: '7871414976211147',
  UNMUTE: '7337137176362961',
  MUTE: '25151904754424642',
  CREATE: '6996806640408138',
  ADMIN_COUNT: '7130823597031706',
  CHANGE_OWNER: '7341777602580933',
  DELETE: '8316537688363079',
  DEMOTE: '6551828931592903'
}

export const XWA_PATHS = {
  PROMOTE: 'xwa2_notify_newsletter_admin_promote',
  DEMOTE: 'xwa2_notify_newsletter_admin_demote',
  ADMIN_COUNT: 'xwa2_newsletter_admin',
  CREATE: 'xwa2_newsletter_create',
  NEWSLETTER: 'xwa2_newsletter',
  METADATA_UPDATE: 'xwa2_notify_newsletter_on_metadata_update'
}

export function isJidNewsletter(jid) {
  return typeof jid === 'string' && jid.endsWith('@newsletter')
}

export function normalizeNewsletterJid(id) {
  const v = String(id || '').trim()
  if (!v) return ''
  return v.includes('@') ? v : `${v}@newsletter`
}

export function extractNewsletterMetadata(node, isCreate = false) {
  const resultNode = getBinaryNodeChild(node, 'result')
  const raw = resultNode?.content?.toString()
  const data = raw ? JSON.parse(raw).data : null
  const metadataPath = data?.[isCreate ? XWA_PATHS.CREATE : XWA_PATHS.NEWSLETTER]
  if (!metadataPath) return null

  const tm = metadataPath.thread_metadata || {}
  const nameObj = tm.name || {}
  const descObj = tm.description || {}
  const pic = tm.picture || null
  const prev = tm.preview || null
  const settings = tm.settings || {}
  const reactionCodes = settings.reaction_codes || {}

  return {
    id: metadataPath.id,
    state: metadataPath.state?.type,
    creation_time: +(tm.creation_time || 0),
    name: nameObj.text || '',
    nameTime: +(nameObj.update_time || 0),
    description: descObj.text || '',
    descriptionTime: +(descObj.update_time || 0),
    invite: tm.invite,
    handle: tm.handle,
    picture: pic?.direct_path || null,
    preview: prev?.direct_path || null,
    reaction_codes: reactionCodes.value,
    subscribers: +(tm.subscribers_count || 0),
    verification: tm.verification,
    viewer_metadata: metadataPath.viewer_metadata
  }
}

function _getTextEncoder() {
  if (globalThis.TextEncoder) return new globalThis.TextEncoder()
  const util = _patchRequire('util')
  return new util.TextEncoder()
}

function _pickGenerateTag(sock) {
  if (typeof sock?.generateMessageTag === 'function') return () => sock.generateMessageTag()
  if (typeof sock?.generateMessageID === 'function') return () => sock.generateMessageID()
  if (typeof generateMessageID === 'function') return () => generateMessageID()
  return () => String(Date.now())
}

function _ensureSock(sock) {
  if (!sock) throw new Error('sock is required')
  if (typeof sock.query !== 'function') throw new Error('sock.query is required')
  if (typeof sock.relayMessage !== 'function') throw new Error('sock.relayMessage is required')
  if (typeof sock.sendMessage !== 'function') throw new Error('sock.sendMessage is required')
  if (typeof sock.waUploadToServer !== 'function') throw new Error('sock.waUploadToServer is required')
  return sock
}

async function _maybeDecryptNewsletterMessage(sock, messageNode) {
  const authState = sock?.authState
  const signalRepository = sock?.signalRepository
  const myId = authState?.creds?.me?.id
  const myLid = authState?.creds?.me?.lid || ''
  if (!decryptMessageNode || !authState || !signalRepository || !myId) return null

  const { fullMessage, decrypt } = await decryptMessageNode(
    messageNode,
    myId,
    myLid,
    signalRepository,
    sock?.logger
  )
  await decrypt()
  return fullMessage
}

function generateWaveform(length = 12) {
  return Array.from({ length }, () => Math.floor(Math.random() * 256))
}

function _toUint8Thumb(v) {
  if (!v) return undefined
  if (Buffer.isBuffer(v)) return v
  if (v instanceof Uint8Array) return Buffer.from(v)
  return undefined
}
async function _uploadToServerNewsletter(sock, stream, opts = {}) {
  const up = await sock.waUploadToServer(stream, { ...opts, newsletter: true })
  return {
    mediaUrl: up?.url,
    directPath: up?.directPath,
    handle: up?.handle
  }
}

function _pickFirstMessageNode(msg = {}) {
  if (!msg || typeof msg !== 'object') return null
  if (msg.ephemeralMessage?.message) return _pickFirstMessageNode(msg.ephemeralMessage.message)
  if (msg.viewOnceMessage?.message) return _pickFirstMessageNode(msg.viewOnceMessage.message)
  if (msg.viewOnceMessageV2?.message) return _pickFirstMessageNode(msg.viewOnceMessageV2.message)
  if (msg.viewOnceMessageV2Extension?.message) return _pickFirstMessageNode(msg.viewOnceMessageV2Extension.message)
  const key = Object.keys(msg)[0]
  return key ? msg[key] : null
}

export function normalizeNewsletterMsg(msg = {}) {
  const remoteJid = msg?.key?.remoteJid || msg?.remoteJid || ''
  if (!isJidNewsletter(remoteJid)) return msg

  msg.isNewsletter = true
  if (typeof msg.newsletterJid === 'undefined') msg.newsletterJid = remoteJid
  if (typeof msg.newsletterServerId === 'undefined') {
    msg.newsletterServerId = msg?.server_id || msg?.update?.server_id || null
  }

  const node = _pickFirstMessageNode(msg.message || msg.update?.message || {})
  const ctx = node?.contextInfo || {}
  if (ctx.forwardedNewsletterMessageInfo && !msg.forwardedNewsletterMessageInfo) {
    msg.forwardedNewsletterMessageInfo = ctx.forwardedNewsletterMessageInfo
  }
  return msg
}

export function patchSocketNewsletterEvents(sock) {
  if (!sock?.ev || sock.__newsletterEventsPatched) return sock
  const originalEmit = sock.ev.emit.bind(sock.ev)
  sock.ev.emit = function patchedNewsletterEmit(event, payload) {
    try {
      if (event === 'messages.upsert' && Array.isArray(payload?.messages)) {
        payload.messages = payload.messages.map((item) => normalizeNewsletterMsg(item))
      } else if (event === 'messages.update' && Array.isArray(payload)) {
        payload = payload.map((item) => normalizeNewsletterMsg(item))
      }
    } catch {}
    return originalEmit(event, payload)
  }
  sock.__newsletterEventsPatched = true
  return sock
}

export function makeNewsletterHelper(sock) {
  sock = _ensureSock(sock)
  patchSocketNewsletterEvents(sock)

  const encoder = _getTextEncoder()
  const genTag = _pickGenerateTag(sock)

  const newsletterQuery = async (to, type, content) => {
    return sock.query({
      tag: 'iq',
      attrs: { id: genTag(), type, xmlns: 'newsletter', to },
      content
    })
  }

  const newsletterWMexQuery = async (newsletterId, query_id, variables = {}) => {
    const jid = newsletterId ? normalizeNewsletterJid(newsletterId) : undefined
    return sock.query({
      tag: 'iq',
      attrs: { id: genTag(), type: 'get', xmlns: 'w:mex', to: S_WHATSAPP_NET },
      content: [
        {
          tag: 'query',
          attrs: { query_id },
          content: encoder.encode(
            JSON.stringify({
              variables: {
                newsletter_id: jid,
                ...variables
              }
            })
          )
        }
      ]
    })
  }

  const isFollowingNewsletter = async (jid) => {
    try {
      const result = await newsletterWMexQuery(jid, NEWSLETTER_QUERY_IDS.METADATA, {
        input: { key: normalizeNewsletterJid(jid), type: 'NEWSLETTER', view_role: 'GUEST' },
        fetch_viewer_metadata: true
      })
      const buff = getBinaryNodeChild(result, 'result')?.content?.toString()
      if (!buff) return false
      const data = JSON.parse(buff).data?.[XWA_PATHS.NEWSLETTER]
      return data?.viewer_metadata?.is_subscribed === true
    } catch {
      return false
    }
  }

  const parseFetchedUpdates = async (node, type) => {
    let child
    if (type === 'messages') {
      child = getBinaryNodeChild(node, 'messages')
    } else {
      const parent = getBinaryNodeChild(node, 'message_updates')
      child = getBinaryNodeChild(parent, 'messages')
    }

    const items = getAllBinaryNodeChildren(child) || []
    const out = await Promise.all(
      items.map(async (messageNode) => {
        const fromJid = child?.attrs?.jid
        if (fromJid) messageNode.attrs.from = fromJid

        const views = parseInt(getBinaryNodeChild(messageNode, 'views_count')?.attrs?.count || '0')
        const reactionNode = getBinaryNodeChild(messageNode, 'reactions')
        const reactions =
          (getBinaryNodeChildren(reactionNode, 'reaction') || []).map(({ attrs }) => ({
            count: +attrs.count,
            code: attrs.code
          })) || []

        const data = { server_id: messageNode.attrs.server_id, views, reactions }

        if (type === 'messages') {
          const msg = await _maybeDecryptNewsletterMessage(sock, messageNode)
          if (msg) data.message = msg
        }

        return data
      })
    )

    return out
  }

  
  const sendNewsletterMessage = async (type, newsletterId, buffer, options = {}) => {
    const upper = String(type || '').toUpperCase()
    const jid = normalizeNewsletterJid(newsletterId)
    if (!jid) throw new Error('newsletterId is required')
    if (!Buffer.isBuffer(buffer)) throw new Error('buffer must be Buffer')

    const jpegThumbnail = _toUint8Thumb(options.jpegThumbnail)

    let messageInput = null
    if (upper === 'IMAGE') {
      messageInput = {
        image: buffer,
        caption: options.caption || '',
        mimetype: options.mimetype,
        jpegThumbnail
      }
    } else if (upper === 'VIDEO') {
      messageInput = {
        video: buffer,
        caption: options.caption || '',
        mimetype: options.mimetype,
        gifPlayback: !!options.gifPlayback,
        jpegThumbnail
      }
    } else if (upper === 'PTV') {
      messageInput = {
        video: buffer,
        ptv: true,
        mimetype: options.mimetype,
        jpegThumbnail
      }
    } else if (upper === 'DOCUMENT') {
      messageInput = {
        document: buffer,
        mimetype: options.mimetype,
        fileName: options.fileName || 'file',
        title: options.title,
        jpegThumbnail
      }
    } else if (upper === 'VOICE' || upper === 'PTT') {
      messageInput = {
        audio: buffer,
        ptt: true,
        mimetype: options.mimetype || 'audio/ogg; codecs=opus',
        seconds: options.seconds,
        waveform: options.waveform || generateWaveform(12)
      }
    } else if (upper === 'AUDIO') {
      messageInput = {
        audio: buffer,
        ptt: !!options.ptt,
        mimetype: options.mimetype || 'audio/mpeg',
        seconds: options.seconds
      }
    } else {
      throw new Error(`Unsupported newsletter type: ${upper}`)
    }

    const mediaMsg = await prepareWAMessageMedia(messageInput, {
      logger: sock.logger,
      newsletter: true,
      upload: (stream, opts) => _uploadToServerNewsletter(sock, stream, opts)
    })

    const msgId =
      options.messageId ||
      (typeof sock.generateMessageTag === 'function'
        ? sock.generateMessageTag()
        : genTag())

    return sock.relayMessage(jid, mediaMsg, {
      messageId: msgId,
      additionalAttributes: { ...(options.additionalAttributes || {}), newsletter: 'true' }
    })
  }

  const sendNewsletterVoice = async (newsletterId, buffer, options = {}) => {
    return sendNewsletterMessage('PTT', newsletterId, buffer, {
      mimetype: options.mimetype || 'audio/ogg; codecs=opus',
      seconds: options.seconds,
      waveform: options.waveform,
      additionalAttributes: options.additionalAttributes,
      messageId: options.messageId
    })
  }

  
  const sendNewsletterText = async (newsletterId, text, options = {}) => {
    const jid = normalizeNewsletterJid(newsletterId)
    if (!jid) throw new Error('newsletterId is required')
    const msg = generateWAMessageFromContent(
      jid,
      { extendedTextMessage: { text: text || ' ', contextInfo: options.contextInfo || {} } },
      { userJid: sock.user?.id, logger: sock.logger, ...options.sendOptions }
    )
    return sock.relayMessage(jid, msg.message, {
      messageId: options.messageId || msg.key.id,
      additionalAttributes: { ...(options.additionalAttributes || {}), newsletter: 'true' }
    })
  }

  const relayNewsletterMessage = async (newsletterId, message, relayOptions = {}) => {
    const jid = normalizeNewsletterJid(newsletterId)
    const msgId =
      relayOptions.messageId ||
      (typeof sock.generateMessageTag === 'function'
        ? sock.generateMessageTag()
        : genTag())

    const additionalAttributes = { ...(relayOptions.additionalAttributes || {}), newsletter: 'true' }
    return sock.relayMessage(jid, message, { ...relayOptions, messageId: msgId, additionalAttributes })
  }

  return {
    newsletterQuery,
    newsletterWMexQuery,
    isFollowingNewsletter,

    subscribeNewsletterUpdates: async (jid) => {
      const res = await newsletterQuery(normalizeNewsletterJid(jid), 'set', [
        { tag: 'live_updates', attrs: {}, content: [] }
      ])
      return getBinaryNodeChild(res, 'live_updates')?.attrs
    },

    newsletterReactionMode: async (jid, mode) => {
      await newsletterWMexQuery(jid, NEWSLETTER_QUERY_IDS.JOB_MUTATION, {
        updates: { settings: { reaction_codes: { value: mode } } }
      })
    },

    newsletterUpdateDescription: async (jid, description) => {
      await newsletterWMexQuery(jid, NEWSLETTER_QUERY_IDS.JOB_MUTATION, {
        updates: { description: description || '', settings: null }
      })
    },

    newsletterUpdateName: async (jid, name) => {
      await newsletterWMexQuery(jid, NEWSLETTER_QUERY_IDS.JOB_MUTATION, {
        updates: { name, settings: null }
      })
    },

    newsletterUpdatePicture: async (jid, content) => {
      const { img } = await generateProfilePicture(content)
      await newsletterWMexQuery(jid, NEWSLETTER_QUERY_IDS.JOB_MUTATION, {
        updates: { picture: img.toString('base64'), settings: null }
      })
    },

    newsletterRemovePicture: async (jid) => {
      await newsletterWMexQuery(jid, NEWSLETTER_QUERY_IDS.JOB_MUTATION, {
        updates: { picture: '', settings: null }
      })
    },

    newsletterUnfollow: async (jid) => {
      await newsletterWMexQuery(jid, NEWSLETTER_QUERY_IDS.UNFOLLOW)
    },

    newsletterFollow: async (jid) => {
      await newsletterWMexQuery(jid, NEWSLETTER_QUERY_IDS.FOLLOW)
    },

    newsletterUnmute: async (jid) => {
      await newsletterWMexQuery(jid, NEWSLETTER_QUERY_IDS.UNMUTE)
    },

    newsletterMute: async (jid) => {
      await newsletterWMexQuery(jid, NEWSLETTER_QUERY_IDS.MUTE)
    },

    newsletterCreate: async (name, description = null, picture = null) => {
      await sock.query({
        tag: 'iq',
        attrs: { to: S_WHATSAPP_NET, xmlns: 'tos', id: genTag(), type: 'set' },
        content: [{ tag: 'notice', attrs: { id: '20601218', stage: '5' }, content: [] }]
      })

      const result = await newsletterWMexQuery(undefined, NEWSLETTER_QUERY_IDS.CREATE, {
        input: {
          name,
          description,
          picture: picture ? (await generateProfilePicture(picture)).img.toString('base64') : null,
          settings: null
        }
      })

      return extractNewsletterMetadata(result, true)
    },

    newsletterMetadata: async (type, key, role = 'GUEST') => {
      const result = await newsletterWMexQuery(undefined, NEWSLETTER_QUERY_IDS.METADATA, {
        input: { key, type: String(type || '').toUpperCase(), view_role: role },
        fetch_viewer_metadata: true,
        fetch_full_image: true,
        fetch_creation_time: true
      })
      return extractNewsletterMetadata(result, false)
    },

    newsletterAdminCount: async (jid) => {
      const result = await newsletterWMexQuery(jid, NEWSLETTER_QUERY_IDS.ADMIN_COUNT)
      const buff = getBinaryNodeChild(result, 'result')?.content?.toString()
      const data = buff ? JSON.parse(buff).data?.[XWA_PATHS.ADMIN_COUNT] : null
      return data?.admin_count
    },

    newsletterChangeOwner: async (jid, user_lid) => {
      await newsletterWMexQuery(jid, NEWSLETTER_QUERY_IDS.CHANGE_OWNER, { user_id: user_lid })
    },

    newsletterDemote: async (jid, user_lid) => {
      await newsletterWMexQuery(jid, NEWSLETTER_QUERY_IDS.DEMOTE, { user_id: user_lid })
    },

    newsletterDelete: async (jid) => {
      await newsletterWMexQuery(jid, NEWSLETTER_QUERY_IDS.DELETE)
    },

    newsletterReactMessage: async (jid, server_id, code) => {
      const id = typeof generateMessageID === 'function' ? generateMessageID() : genTag()
      await sock.query({
        tag: 'message',
        attrs: {
          to: normalizeNewsletterJid(jid),
          ...(!code ? { edit: '7' } : {}),
          type: 'reaction',
          server_id,
          id
        },
        content: [{ tag: 'reaction', attrs: code ? { code } : {} }]
      })
    },

    newsletterFetchMessages: async (type, key, count, after) => {
      const afterStr = after?.toString()
      const result = await newsletterQuery(S_WHATSAPP_NET, 'get', [
        {
          tag: 'messages',
          attrs: {
            type,
            ...(type === 'invite' ? { key } : { jid: key }),
            count: String(count),
            after: afterStr || '100'
          }
        }
      ])
      return parseFetchedUpdates(result, 'messages')
    },

    newsletterFetchUpdates: async (jid, count, after, since) => {
      const result = await newsletterQuery(normalizeNewsletterJid(jid), 'get', [
        {
          tag: 'message_updates',
          attrs: {
            count: String(count),
            after: after?.toString() || '100',
            since: since?.toString() || '0'
          }
        }
      ])
      return parseFetchedUpdates(result, 'updates')
    },

    sendNewsletterMessage,
    sendNewsletterVoice,
    sendNewsletterText,
    relayNewsletterMessage,

    sendNewsletterTextLegacy: async (newsletterId, text, options = {}) => {
      const jid = normalizeNewsletterJid(newsletterId)
      const msg = generateWAMessageFromContent(
        jid,
        { extendedTextMessage: { text: text || ' ', contextInfo: options.contextInfo || {} } },
        { userJid: sock.user?.id, logger: sock.logger, ...options }
      )
      return sock.relayMessage(jid, msg.message, {
        messageId: options.messageId || msg.key.id,
        additionalAttributes: { ...(options.additionalAttributes || {}), newsletter: 'true' }
      })
    }
  }
}

const _patchRequire = createRequire(import.meta.url)

function readSafe(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return null; }
}

function countOccur(hay, needle) {
  return (hay.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
}

function resolveBaileysRoot() {
  const tries = [
    "naileys/package.json",
    "baileys/package.json",
    "@whiskeysockets/baileys/package.json",
  ];

  const errors = [];
  for (const t of tries) {
    try {
      const pkgJson = _patchRequire.resolve(t);
      return { root: path.dirname(pkgJson), used: t };
    } catch (e) {
      errors.push({ target: t, err: String(e?.message || e) });
    }
  }

  return { root: null, used: null, errors };
}

export function patchBaileysNewsletterMediaRc13_FORCE() {
  const resolved = resolveBaileysRoot();
  if (!resolved.root) {
    return {
      ok: false,
      reason: "cannot resolve naileys package.json",
      tried: resolved.errors,
    };
  }

  const root = resolved.root;

  const candidates = [
    path.join(root, "lib", "Socket", "messages-send.js"),
    path.join(root, "lib", "Socket", "messages-send.cjs"),
    path.join(root, "lib", "Socket", "messages-send.mjs"),
  ].filter((p) => fs.existsSync(p));

  if (!candidates.length) {
    return { ok: false, reason: "no candidates", root, used: resolved.used };
  }

  const results = [];

  for (const file of candidates) {
    let code = readSafe(file);
    if (!code) {
      results.push({ file, ok: false, reason: "cannot read" });
      continue;
    }

    const beforeWAProtoCount = countOccur(code, "WAProto");
    const beforeNewsletterBlocks =
      (code.match(/if\s*\(\s*isNewsletter\s*\)\s*\{/g) || []).length;

    const replacement = `
if (isNewsletter) {
  const patched = patchMessageBeforeSending ? await patchMessageBeforeSending(message, []) : message;
  if (Array.isArray(patched)) {
    throw new Error("Per-jid patching is not supported in channel");
  }

  const bytes = encodeNewsletterMessage(patched);
  const mediaType = getMediaType(patched);

  binaryNodeContent.push({
    tag: "plaintext",
    attrs: mediaType ? { mediatype: mediaType } : {},
    content: bytes
  });

  const stanza = {
    tag: "message",
    attrs: {
      to: jid,
      id: msgId,
      type: getMessageType(patched),
      ...(additionalAttributes || {})
    },
    content: binaryNodeContent
  };

  logger.debug({ msgId, mediaType }, \`sending newsletter message to \${jid}\`);
  await sendNode(stanza);
  return;
}
`.trim();

    const reBlockGlobal =
      /if\s*\(\s*isNewsletter\s*\)\s*\{[\s\S]*?\n\s*return\s*;\s*\n\s*\}/g;

    let patchedBlocks = 0;
    code = code.replace(reBlockGlobal, () => {
      patchedBlocks++;
      return replacement;
    });

    if (patchedBlocks === 0) {
      const reBlockFallback =
        /if\s*\(\s*isNewsletter\s*\)\s*\{[\s\S]*?return\s*;\s*\}/g;
      code = code.replace(reBlockFallback, () => {
        patchedBlocks++;
        return replacement;
      });
    }

    if (code.includes("WAProto")) {
      code = code
        .split("\n")
        .filter((line) => !line.includes("WAProto"))
        .join("\n");
    }

    fs.writeFileSync(file, code, "utf8");

    const after = readSafe(file) || "";
    const afterWAProtoCount = countOccur(after, "WAProto");
    const afterNewsletterBlocks =
      (after.match(/if\s*\(\s*isNewsletter\s*\)\s*\{/g) || []).length;

    const safeNow =
      after.includes("encodeNewsletterMessage(patched)") &&
      after.includes("getMediaType(patched)") &&
      after.includes("mediatype") &&
      !after.includes("WAProto");

    results.push({
      file,
      ok: true,
      patched: patchedBlocks > 0,
      patchedBlocks,
      beforeNewsletterBlocks,
      afterNewsletterBlocks,
      beforeWAProtoCount,
      afterWAProtoCount,
      safeNow,
    });
  }

  return { ok: true, used: resolved.used, root, results };
}

// ─────────────────────────────────────────────────────────────
// CHANNEL / NEWSLETTER / SALURAN HELPERS
// Dipindahkan dan disesuaikan dari script sumber ke satu lib khusus.
// ─────────────────────────────────────────────────────────────

const channelTargetCache = new Map()

export function isNewsletterJid(value = '') {
  return /@newsletter$/i.test(String(value || '').trim())
}

export function extractInviteCode(input = '') {
  const s = String(input || '').trim()
  if (!s) return ''
  const m1 = s.match(/whatsapp\.com\/channel\/([A-Za-z0-9]+)/i)
  if (m1?.[1]) return m1[1]
  const m2 = s.match(/channel\/([A-Za-z0-9]+)/i)
  if (m2?.[1]) return m2[1]
  return ''
}

export function getOwnerChannelLink() {
  return String(ownerChannelLink || '').trim()
}

export function getOwnerChannelJidFallback() {
  return String(ownerChannelJid || ownerChannelId || '').trim()
}

export function getNewsletterHelper(sock) {
  if (!sock) return null
  if (sock.newsletter && typeof sock.newsletter === 'object') return sock.newsletter
  try {
    const helper = makeNewsletterHelper(sock)
    sock.newsletter = helper
    for (const [key, value] of Object.entries(helper)) {
      if (typeof value === 'function' && typeof sock[key] !== 'function') sock[key] = value
    }
    return helper
  } catch {
    return null
  }
}

export function attachNewsletterFeatures(sock) {
  const helper = getNewsletterHelper(sock)
  return helper
}

function getNewsletterMetaFn(sock, newsletter) {
  return (
    sock?.newsletterMetadata ||
    sock?.getNewsletterMetadata ||
    sock?.newsletter?.metadata ||
    sock?.newsletter?.newsletterMetadata ||
    newsletter?.newsletterMetadata ||
    newsletter?.metadata ||
    null
  )
}

async function resolveInvite(sock, code, newsletter) {
  const key = `invite:${code}`
  if (channelTargetCache.has(key)) return channelTargetCache.get(key)

  const helper = newsletter || getNewsletterHelper(sock)
  const metaFn = getNewsletterMetaFn(sock, helper)
  if (typeof metaFn !== 'function') {
    throw new Error('Fitur newsletter metadata belum aktif di socket.')
  }

  let meta = null
  let lastErr = null
  for (const [type, role] of [['invite', 'GUEST'], ['INVITE', 'GUEST']]) {
    try {
      meta = await metaFn.call(sock, type, code, role)
      if (meta) break
    } catch (error) {
      lastErr = error
    }
  }

  const jid = normalizeNewsletterJid(meta?.id || meta?.jid || '')
  if (!jid) throw new Error(lastErr?.message || 'Gagal resolve ID channel dari link.')
  channelTargetCache.set(key, jid)
  return jid
}

export async function resolveChannelTarget(sock, input, newsletter) {
  const raw = String(input || '').trim()
  if (!raw) throw new Error('Target channel kosong.')
  if (isNewsletterJid(raw)) return normalizeNewsletterJid(raw)
  if (/^\d+@newsletter$/i.test(raw)) return normalizeNewsletterJid(raw)
  if (/^\d+$/.test(raw)) return normalizeNewsletterJid(raw)
  const code = extractInviteCode(raw)
  if (code) return resolveInvite(sock, code, newsletter)
  throw new Error('Format target channel tidak valid. Gunakan link channel, ID channel, atau JID newsletter.')
}

export async function resolveOwnerChannelJid(sock, newsletter) {
  const helper = newsletter || getNewsletterHelper(sock)
  const fallback = getOwnerChannelJidFallback()
  if (fallback) return resolveChannelTarget(sock, fallback, helper)

  const link = getOwnerChannelLink()
  if (!link) {
    throw new Error('owner channel belum diatur. Isi OWNER_CHANNEL_LINK atau OWNER_CHANNEL_JID')
  }
  return resolveChannelTarget(sock, link, helper)
}

export function clearChannelTargetCache() {
  channelTargetCache.clear()
}

export async function sendInteractive(sock, toJid, content = {}, options = {}) {
  const buttons = Array.isArray(content.interactiveButtons)
    ? content.interactiveButtons
    : Array.isArray(content.buttons)
      ? content.buttons
      : []

  const messageParamsJson = typeof content.messageParamsJson === 'string'
    ? content.messageParamsJson
    : content.messageParamsJson
      ? JSON.stringify(content.messageParamsJson)
      : ''

  const msg = generateWAMessageFromContent(
    toJid,
    {
      interactiveMessage: {
        header: {
          title: content.title || '',
          subtitle: content.subtitle || '',
          hasMediaAttachment: false
        },
        body: {
          text: content.body || content.text || ''
        },
        footer: {
          text: content.footer || ''
        },
        nativeFlowMessage: {
          buttons,
          messageParamsJson
        }
      }
    },
    { quoted: options.quoted }
  )

  await sock.relayMessage(toJid, msg.message, { messageId: msg.key.id })
  return msg
}

export const sendButtons = sendInteractive

function shortChannelText(str, n = 36) {
  const s = String(str || '')
  if (s.length <= n) return s
  return s.slice(0, n - 1) + '…'
}

function fmtNum(n) {
  const x = Number(n || 0)
  if (!Number.isFinite(x)) return '0'
  return Math.trunc(x).toLocaleString('id-ID')
}

export function unwrapChannelMessage(message) {
  let msg = message?.message || message?.msg || message || {}
  for (let i = 0; i < 10; i++) {
    if (msg?.ephemeralMessage?.message) { msg = msg.ephemeralMessage.message; continue }
    if (msg?.viewOnceMessage?.message) { msg = msg.viewOnceMessage.message; continue }
    if (msg?.viewOnceMessageV2?.message) { msg = msg.viewOnceMessageV2.message; continue }
    if (msg?.viewOnceMessageV2Extension?.message) { msg = msg.viewOnceMessageV2Extension.message; continue }
    if (msg?.documentWithCaptionMessage?.message) { msg = msg.documentWithCaptionMessage.message; continue }
    break
  }
  return msg || {}
}

function pickMedia(msgRaw = {}) {
  const m = unwrapChannelMessage(msgRaw) || {}
  if (m.imageMessage) return { kind: 'image', msg: m.imageMessage }
  if (m.videoMessage) return { kind: 'video', msg: m.videoMessage }
  if (m.audioMessage) return { kind: 'audio', msg: m.audioMessage }
  if (m.documentMessage) return { kind: 'document', msg: m.documentMessage }
  if (m.stickerMessage) return { kind: 'sticker', msg: m.stickerMessage }
  return null
}

function findContextInfoDeep(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 14) return null
  if (obj.contextInfo && typeof obj.contextInfo === 'object') return obj.contextInfo
  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if (value && typeof value === 'object') {
      const hit = findContextInfoDeep(value, depth + 1)
      if (hit) return hit
    }
  }
  return null
}

export function getQuotedAndContextInfo(m) {
  const raw = unwrapChannelMessage(m?.message || {}) || {}
  const ci =
    raw?.extendedTextMessage?.contextInfo ||
    raw?.imageMessage?.contextInfo ||
    raw?.videoMessage?.contextInfo ||
    raw?.documentMessage?.contextInfo ||
    raw?.audioMessage?.contextInfo ||
    raw?.stickerMessage?.contextInfo ||
    raw?.buttonsMessage?.contextInfo ||
    raw?.templateMessage?.hydratedTemplate?.contextInfo ||
    raw?.templateMessage?.contextInfo ||
    raw?.interactiveMessage?.contextInfo ||
    raw?.interactiveResponseMessage?.contextInfo ||
    findContextInfoDeep(raw)

  const quotedMessage = ci?.quotedMessage || null
  const quoted = quotedMessage
    ? {
        message: quotedMessage,
        key: {
          remoteJid: m.key.remoteJid,
          fromMe: false,
          id: ci.stanzaId,
          participant: ci.participant
        }
      }
    : null

  return { quoted, ci }
}

function pickNonMediaType(quotedMsgRaw = {}) {
  const q = unwrapChannelMessage(quotedMsgRaw) || {}
  const t = Object.keys(q)[0]
  return { type: t, msg: t ? q[t] : null, raw: q }
}

function getTextFromMessageContent(type, qMsg, captionArg) {
  return (
    captionArg ||
    qMsg?.text ||
    qMsg?.caption ||
    qMsg?.conversation ||
    qMsg?.contentText ||
    qMsg?.hydratedContentText ||
    qMsg?.body?.text ||
    (type ? `(${type})` : '') ||
    ' '
  )
}

function extractTextFromMsg(q) {
  if (!q) return ''
  if (typeof q === 'string') return q
  if (q.text) return q.text
  if (q.caption) return q.caption
  const raw = unwrapChannelMessage(q.message || q.msg || q) || {}
  return raw.conversation ||
    raw.extendedTextMessage?.text ||
    raw.imageMessage?.caption ||
    raw.videoMessage?.caption ||
    raw.documentMessage?.caption ||
    ''
}

function getMimeFromQuoted(q) {
  if (!q) return ''
  if (q.mimetype) return String(q.mimetype).toLowerCase()
  if (q.msg?.mimetype) return String(q.msg.mimetype).toLowerCase()
  const raw = unwrapChannelMessage(q.message || q.msg || q) || {}
  let type = Object.keys(raw).find(k => k.endsWith('Message'))
  if (!type) type = Object.keys(raw)[0]
  if (!type) return ''
  return String(raw?.[type]?.mimetype || '').toLowerCase()
}

async function downloadBuf(q, sock) {
  try {
    const buf = await downloadMediaMessage(q, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage })
    if (buf && Buffer.isBuffer(buf)) return buf
  } catch {}
  try {
    const buf2 = await downloadMediaMessage({ key: q.key, message: q?.message || q?.msg || q }, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage })
    if (buf2 && Buffer.isBuffer(buf2)) return buf2
  } catch {}
  return null
}

async function forwardToChannel(sock, channelJid, rawQuoted) {
  const raw = unwrapChannelMessage(rawQuoted?.message || rawQuoted) || {}
  return sock.relayMessage(channelJid, raw, {})
}

async function probeSeconds(buffer, ext = 'bin') {
  const tmp = path.join(process.cwd(), 'tmp')
  try { if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true }) } catch {}
  const file = path.join(tmp, `channel_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`)

  try {
    fs.writeFileSync(file, buffer)
  } catch {
    return null
  }

  const run = () => new Promise((resolve) => {
    const p = _patchRequire('child_process').spawn('ffprobe', [
      '-v', 'error',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      file
    ])

    let out = ''
    p.stdout.on('data', d => { out += d.toString() })
    p.on('close', code => {
      if (code !== 0) return resolve(null)
      try {
        const json = JSON.parse(out || '{}')
        const duration =
          Number(json?.format?.duration) ||
          Number(json?.streams?.find(s => s?.duration)?.duration) ||
          0
        if (!duration || !isFinite(duration)) return resolve(null)
        resolve(Math.max(1, Math.round(duration)))
      } catch {
        resolve(null)
      }
    })
    p.on('error', () => resolve(null))
  })

  try {
    return await run()
  } finally {
    try { fs.unlinkSync(file) } catch {}
  }
}

async function sendChannelMedia(sock, channelJid, picked, buffer, caption, newsletter) {
  const helper = newsletter || getNewsletterHelper(sock)

  if (picked.kind === 'image') {
    return sock.sendMessage(channelJid, {
      image: buffer,
      mimetype: picked.msg?.mimetype,
      caption
    })
  }

  if (picked.kind === 'video') {
    let seconds = picked.msg?.seconds
    if (!seconds || Number(seconds) <= 0) seconds = await probeSeconds(buffer, 'mp4')

    if (helper?.sendNewsletterMessage) {
      return helper.sendNewsletterMessage(!!picked.msg?.ptv ? 'PTV' : 'VIDEO', channelJid, buffer, {
        mimetype: picked.msg?.mimetype || 'video/mp4',
        caption,
        gifPlayback: !!picked.msg?.gifPlayback,
        jpegThumbnail: picked.msg?.jpegThumbnail
      })
    }

    return sock.sendMessage(channelJid, {
      video: buffer,
      mimetype: picked.msg?.mimetype || 'video/mp4',
      caption,
      seconds: seconds || undefined,
      fileLength: picked.msg?.fileLength,
      jpegThumbnail: picked.msg?.jpegThumbnail,
      ptv: !!picked.msg?.ptv,
      gifPlayback: !!picked.msg?.gifPlayback
    })
  }

  if (picked.kind === 'audio') {
    let seconds = picked.msg?.seconds
    if (!seconds || Number(seconds) <= 0) seconds = await probeSeconds(buffer, 'mp3')

    if (helper?.sendNewsletterMessage) {
      return helper.sendNewsletterMessage('AUDIO', channelJid, buffer, {
        mimetype: picked.msg?.mimetype || 'audio/mpeg',
        seconds: seconds || undefined
      })
    }

    return sock.sendMessage(channelJid, {
      audio: buffer,
      mimetype: picked.msg?.mimetype || 'audio/mpeg',
      ptt: false,
      seconds: seconds || undefined,
      fileLength: picked.msg?.fileLength
    })
  }

  if (picked.kind === 'document') {
    return sock.sendMessage(channelJid, {
      document: buffer,
      mimetype: picked.msg?.mimetype,
      fileName: picked.msg?.fileName || 'file'
    })
  }

  if (picked.kind === 'sticker') {
    return sock.sendMessage(channelJid, { sticker: buffer })
  }
}

function assertOwner(ctx) {
  if (!ctx?.access?.isOwner) throw new Error('Khusus owner.')
}

export async function handleIdChannel(ctx) {
  const { sock, msg, args, from } = ctx
  const input = String(args?.[0] || '').trim()

  if (!input) {
    await sock.sendMessage(from, { text: `Format salah!\nGunakan:\n${defaultPrefix}idch https://whatsapp.com/channel/xxxx` }, { quoted: msg })
    return
  }

  const inviteCode = extractInviteCode(input)
  if (!inviteCode) {
    await sock.sendMessage(from, { text: 'Link channel tidak valid.' }, { quoted: msg })
    return
  }

  try {
    const helper = getNewsletterHelper(sock)
    const metaFn = getNewsletterMetaFn(sock, helper)
    if (typeof metaFn !== 'function') {
      await sock.sendMessage(from, { text: 'Fitur newsletter metadata belum aktif di socket.' }, { quoted: msg })
      return
    }

    const meta = await metaFn.call(sock, 'invite', inviteCode, 'GUEST')
    const chId = normalizeNewsletterJid(meta?.id || meta?.jid || '')
    const name = String(meta?.name || meta?.thread_metadata?.name?.text || meta?.threadMetadata?.name?.text || 'Unknown').trim()
    const followers = fmtNum(meta?.subscribers || meta?.subscribers_count || meta?.subscribersCount || meta?.thread_metadata?.subscribers_count || 0)
    const link = `https://whatsapp.com/channel/${inviteCode}`

    const text =
      `╭─『 *CHANNEL INFO* 』\n` +
      `│\n` +
      `│ *Channel* : ${name}\n` +
      `│ *Pengikut* : ${followers}\n` +
      `│ *ID* : ${chId}\n` +
      `│ *Link* : ${link}\n` +
      `│\n` +
      `╰───────────────`

    await sendInteractive(sock, from, {
      text,
      footer: '© CHANNEL TOOLS',
      buttons: [
        {
          name: 'cta_copy',
          buttonParamsJson: JSON.stringify({
            display_text: 'COPY ID CHANNEL',
            copy_code: chId
          })
        }
      ]
    }, { quoted: msg })
  } catch (error) {
    await sock.sendMessage(from, { text: `Gagal ambil info channel.\n${error?.message || error}` }, { quoted: msg })
  }
}

function collectChannelCandidates(ctx, ownerJid) {
  const set = new Set()
  if (ownerJid) set.add(ownerJid)

  const stores = [
    ctx?.store,
    ctx?.sock?.store,
    globalThis?.store,
    ctx?.sock?.chats
  ]

  for (const st of stores) {
    const chats = st?.chats || st || {}
    if (!chats || typeof chats !== 'object') continue
    for (const id of Object.keys(chats)) {
      if (String(id).endsWith('@newsletter')) set.add(id)
    }
  }

  return [...set]
}

async function fetchChannelMeta(sock, newsletter, jid) {
  const metaFn = getNewsletterMetaFn(sock, newsletter)
  if (typeof metaFn !== 'function') return null
  const tries = [['jid', jid, 'GUEST'], ['NEWSLETTER', jid, 'GUEST'], ['newsletter', jid, 'GUEST']]
  for (const [type, key, role] of tries) {
    try {
      const meta = await metaFn.call(sock, type, key, role)
      if (meta) return meta
    } catch {}
  }
  return null
}

function simplifyMeta(jid, meta, ownerJid) {
  const rawName = meta?.name || meta?.thread_metadata?.name?.text || meta?.threadMetadata?.name?.text || ''
  const subs = Number(meta?.subscribers || meta?.subscribers_count || meta?.subscribersCount || meta?.thread_metadata?.subscribers_count || 0)
  return { jid, name: rawName || jid, subs, owner: jid === ownerJid }
}

function clampPage(n) {
  const value = parseInt(n, 10)
  if (!Number.isFinite(value) || value < 1) return 1
  if (value > 9999) return 9999
  return value
}

export async function handleListChannel(ctx) {
  const { sock, msg, from, text } = ctx
  try {
    assertOwner(ctx)
  } catch (error) {
    await sock.sendMessage(from, { text: error.message }, { quoted: msg })
    return
  }

  const perPage = 20
  const page = clampPage(String(text || '').trim() || '1')
  const helper = getNewsletterHelper(sock)

  let ownerJid = ''
  try { ownerJid = await resolveOwnerChannelJid(sock, helper) } catch {}

  const candidates = collectChannelCandidates(ctx, ownerJid)
  if (!candidates.length) {
    await sock.sendMessage(from, { text: '❌ Bot belum mendeteksi channel/newsletter apa pun.' }, { quoted: msg })
    return
  }

  const metas = []
  for (const jid of candidates) {
    const meta = await fetchChannelMeta(sock, helper, jid)
    metas.push(simplifyMeta(jid, meta, ownerJid))
  }

  metas.sort((a, b) => Number(b.owner) - Number(a.owner) || a.name.localeCompare(b.name))

  const total = metas.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const start = (currentPage - 1) * perPage
  const slice = metas.slice(start, start + perPage)

  const buttons = slice.map((item, i) => ({
    name: 'cta_copy',
    buttonParamsJson: JSON.stringify({
      display_text: shortChannelText(`${item.owner ? '👑 ' : '📢 '}${item.name}${item.subs ? ` | ${item.subs.toLocaleString('id-ID')}` : ''}`, 45),
      copy_code: item.jid,
      id: `copy_ch_${currentPage}_${start + i}`
    })
  }))

  await sendInteractive(sock, from, {
    title: '📢 LIST CHANNEL BOT',
    text: `Total Channel: ${total}\nHalaman: ${currentPage}/${totalPages}\nTombol di bawah ini adalah COPY ID CHANNEL`,
    footer: `Ketik ${defaultPrefix}listch ${currentPage + 1} untuk halaman berikutnya`,
    messageParamsJson: {
      bottom_sheet: {
        in_thread_buttons_limit: 0,
        divider_indices: ownerJid ? [1] : [],
        list_title: `LIST CHANNEL (PAGE ${currentPage}/${totalPages})`,
        button_title: `📂 BUKA LIST COPY (${slice.length})`
      }
    },
    buttons
  }, { quoted: msg })
}

export async function handleToChannel(ctx) {
  const { sock, msg, from, text } = ctx
  try {
    assertOwner(ctx)
  } catch (error) {
    await sock.sendMessage(from, { text: error.message }, { quoted: msg })
    return
  }

  const helper = getNewsletterHelper(sock)
  const { quoted } = getQuotedAndContextInfo(msg)
  const source = quoted || msg
  const mime = getMimeFromQuoted(source)

  let textToSend = String(text || '').trim()
  if (!textToSend && quoted) {
    textToSend = extractTextFromMsg(quoted).replace(/^\.(ptvch|toch|upch)\s*/i, '').trim()
  }

  if (!mime && !textToSend) {
    await sock.sendMessage(from, { text: 'Contoh: .toch (reply/kirim media atau teks)' }, { quoted: msg })
    return
  }

  try {
    try { await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }) } catch {}

    const channelJid = await resolveOwnerChannelJid(sock, helper)

    if (mime) {
      const media = await downloadBuf(source, sock)
      if (!media) {
        await sock.sendMessage(from, { text: 'Media tidak bisa diunduh.' }, { quoted: msg })
        return
      }

      const payload = {}
      if (textToSend) payload.caption = textToSend

      if (/image/i.test(mime)) {
        payload.image = media
        payload.mimetype = mime
      } else if (/video|mp4/i.test(mime)) {
        payload.video = media
        payload.mimetype = mime
      } else if (/audio/i.test(mime)) {
        payload.audio = media
        payload.mimetype = mime
      } else if (/webp/i.test(mime)) {
        payload.sticker = media
      } else {
        payload.document = media
        payload.mimetype = mime
        payload.fileName = 'file'
      }

      await sock.sendMessage(channelJid, payload)
    } else {
      await sock.sendMessage(channelJid, { text: textToSend })
    }

    await sock.sendMessage(from, { text: '✅ Berhasil kirim ke channel.' }, { quoted: msg })
  } catch (error) {
    await sock.sendMessage(from, { text: `Gagal kirim ke channel.\n${error?.message || error}` }, { quoted: msg })
  }
}

export async function handlePtvChannel(ctx) {
  const { sock, msg, from } = ctx
  try {
    assertOwner(ctx)
  } catch (error) {
    await sock.sendMessage(from, { text: error.message }, { quoted: msg })
    return
  }

  const helper = getNewsletterHelper(sock)
  const { quoted } = getQuotedAndContextInfo(msg)
  const source = quoted || msg
  const mime = getMimeFromQuoted(source)

  if (!/webp|image|video|gif|viewonce|mp4/i.test(mime)) {
    await sock.sendMessage(from, { text: 'Contoh: .ptvch (reply/kirim media)' }, { quoted: msg })
    return
  }

  const media = await downloadBuf(source, sock)
  if (!media) {
    await sock.sendMessage(from, { text: 'Media tidak bisa diunduh.' }, { quoted: msg })
    return
  }

  try {
    try { await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }) } catch {}
    const channelJid = await resolveOwnerChannelJid(sock, helper)
    if (helper?.sendNewsletterMessage) {
      await helper.sendNewsletterMessage('PTV', channelJid, media, { mimetype: mime || 'video/mp4', ptv: true })
    } else {
      await sock.sendMessage(channelJid, { video: media, ptv: true }, {})
    }
    await sock.sendMessage(from, { text: '✅ Berhasil kirim ke channel.' }, { quoted: msg })
  } catch (error) {
    await sock.sendMessage(from, { text: `Gagal kirim ke channel.\n${error?.message || error}` }, { quoted: msg })
  }
}

export async function handleUpChannel(ctx) {
  const { sock, msg, from, text } = ctx
  try {
    assertOwner(ctx)
  } catch (error) {
    await sock.sendMessage(from, { text: error.message }, { quoted: msg })
    return
  }

  const helper = getNewsletterHelper(sock)
  const captionArg = String(text || '').trim()
  const possibleCI = findContextInfoDeep(unwrapChannelMessage(msg?.message || {}) || {})

  if (captionArg && !possibleCI?.quotedMessage) {
    try {
      const channelJid = await resolveOwnerChannelJid(sock, helper)
      await sock.sendMessage(channelJid, { text: captionArg })
      await sock.sendMessage(from, { text: '✅ Teks berhasil dikirim ke channel.' }, { quoted: msg })
    } catch (error) {
      await sock.sendMessage(from, { text: `❌ Gagal kirim teks: ${String(error?.message || error)}` }, { quoted: msg })
    }
    return
  }

  const { quoted, ci } = getQuotedAndContextInfo(msg)
  const rawQuoted = quoted || msg

  if (!rawQuoted) {
    await sock.sendMessage(
      from,
      { text: 'Reply pesan/media dulu lalu ketik .upch\nAtau: .upch teks (tanpa reply) untuk kirim teks ke channel.' },
      { quoted: msg }
    )
    return
  }

  const picked = pickMedia(rawQuoted?.message || rawQuoted?.msg || rawQuoted)

  if (picked) {
    let buffer
    try {
      buffer = await downloadMediaMessage(rawQuoted, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage })
    } catch (error) {
      await sock.sendMessage(from, { text: `❌ Gagal download media: ${String(error?.message || error)}` }, { quoted: msg })
      return
    }

    const finalCaption = captionArg || picked.msg?.caption || ''

    try {
      const channelJid = await resolveOwnerChannelJid(sock, helper)
      await sendChannelMedia(sock, channelJid, picked, buffer, finalCaption, helper)
      await sock.sendMessage(from, { text: '✅ Media berhasil dikirim ke channel.' }, { quoted: msg })
    } catch (error) {
      await sock.sendMessage(from, { text: `❌ Gagal kirim media ke channel: ${String(error?.message || error)}` }, { quoted: msg })
    }
    return
  }

  const qRaw = unwrapChannelMessage(rawQuoted?.message || rawQuoted) || {}
  const { type, msg: qMsg } = pickNonMediaType(qRaw)
  const externalAdReply = ci?.externalAdReply || null

  if (externalAdReply) {
    try {
      const baseText = getTextFromMessageContent(type, qMsg, captionArg)
      const channelJid = await resolveOwnerChannelJid(sock, helper)
      await sock.sendMessage(channelJid, { text: baseText, contextInfo: { externalAdReply } })
      await sock.sendMessage(from, { text: '✅ AdReply berhasil dikirim ke channel.' }, { quoted: msg })
    } catch (error) {
      await sock.sendMessage(from, { text: `❌ Gagal kirim AdReply: ${String(error?.message || error)}` }, { quoted: msg })
    }
    return
  }

  if (type === 'buttonsMessage' || type === 'templateMessage' || type === 'interactiveMessage') {
    try {
      const channelJid = await resolveOwnerChannelJid(sock, helper)
      await forwardToChannel(sock, channelJid, rawQuoted)
      await sock.sendMessage(from, { text: '✅ Button/Interactive berhasil di-forward ke channel.' }, { quoted: msg })
    } catch (error) {
      const fallbackText = getTextFromMessageContent(type, qMsg, captionArg)
      try {
        const channelJid = await resolveOwnerChannelJid(sock, helper)
        await sock.sendMessage(channelJid, { text: fallbackText })
      } catch {}
      await sock.sendMessage(from, { text: `⚠️ Forward gagal, fallback teks terkirim.\n${String(error?.message || error)}` }, { quoted: msg })
    }
    return
  }

  try {
    const channelJid = await resolveOwnerChannelJid(sock, helper)
    await forwardToChannel(sock, channelJid, rawQuoted)
    await sock.sendMessage(from, { text: '✅ Pesan berhasil di-forward ke channel.' }, { quoted: msg })
  } catch (error) {
    const fallbackText = getTextFromMessageContent(type, qMsg, captionArg)
    try {
      const channelJid = await resolveOwnerChannelJid(sock, helper)
      await sock.sendMessage(channelJid, { text: fallbackText })
    } catch {}
    await sock.sendMessage(from, { text: `⚠️ Forward gagal, fallback teks terkirim.\n${String(error?.message || error)}` }, { quoted: msg })
  }
}


// Simple public helpers for direct use from Naileys socket.
// These are intentionally small wrappers around the newsletter helpers above.
export async function upch(sock, target, input, options = {}) {
  if (!sock) throw new Error('Socket is required')
  const helper = getNewsletterHelper(sock)
  const channelJid = await resolveChannelTarget(sock, target, helper)

  if (typeof input === 'string') {
    return await sock.sendMessage(channelJid, { text: input }, options)
  }

  if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
    const type = options.type || 'image'
    const payload = { [type]: Buffer.from(input) }
    if (options.caption) payload.caption = options.caption
    if (options.mimetype) payload.mimetype = options.mimetype
    if (options.ptv) payload.ptv = true
    return await sock.sendMessage(channelJid, payload, options)
  }

  if (input && typeof input === 'object') {
    const directKeys = ['text', 'image', 'video', 'audio', 'document', 'sticker', 'extendedTextMessage', 'interactiveMessage', 'buttonsMessage']
    if (directKeys.some(key => input[key])) {
      return await sock.sendMessage(channelJid, input, options)
    }

    const rawQuoted = input
    const picked = pickMedia(rawQuoted?.message || rawQuoted?.msg || rawQuoted)
    if (picked) {
      const buffer = await downloadMediaMessage(rawQuoted, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage })
      const caption = options.caption || picked.msg?.caption || ''
      return await sendChannelMedia(sock, channelJid, picked, buffer, caption, helper)
    }

    try {
      return await forwardToChannel(sock, channelJid, rawQuoted)
    } catch (error) {
      const qRaw = unwrapChannelMessage(rawQuoted?.message || rawQuoted) || {}
      const { type, msg } = pickNonMediaType(qRaw)
      const text = getTextFromMessageContent(type, msg, options.caption || '')
      if (text) return await sock.sendMessage(channelJid, { text }, options)
      throw error
    }
  }

  throw new Error('Input channel tidak valid.')
}

export async function toch(sock, target, input, options = {}) {
  return await upch(sock, target, input, options)
}

export async function ptvch(sock, target, input, options = {}) {
  return await upch(sock, target, input, { ...options, type: 'video', ptv: true })
}
