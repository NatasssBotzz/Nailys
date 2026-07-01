<h1 align='center'>Nailys</h1>

<div align='center'>A WebSockets-based TypeScript library for interacting with the WhatsApp Web API — with native builders for stickers, interactive messages, payments, newsletters, AI-rich responses, and more.</div>

<div align='center'>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)

</div>

> **Nailys** is a fork of [Baileys](https://github.com/WhiskeySockets/Baileys) with **batteries included** — all common bot features (sticker builders, interactive messages, newsletter/channel posting, SWGC, payments, AI-rich responses, and more) are built directly into the socket. No manual patching, no disk hacks, no extra imports.

---

# Important Note

This is the official README for Nailys — a Baileys fork maintained by [NatasssBotzz](https://github.com/NatasssBotzz). All features from the original Baileys are preserved and extended with native builders.

Original Baileys docs: https://baileys.wiki

Original Baileys Discord: https://discord.gg/WeJM5FP9GG

---

# Why Nailys?

| Feature | Baileys | Nailys |
|---|---|---|
| Core WhatsApp API | ✅ | ✅ |
| Pairing Code (with custom code) | ✅ basic | ✅ **custom code + auto-format** |
| Sticker / Sticker Pack Builder | ❌ need external lib | ✅ `sock.sendSticker()` / `sock.sendStickerPack()` |
| SWGC (WhatsApp Group Status) | ❌ | ✅ `sock.swgc()` / `sock.swgcBuilder()` |
| Interactive Messages (Buttons, Carousel) | ❌ | ✅ `sock.button()` / `sock.carouselBuilder()` |
| Newsletter / Channel Posting (UPCH) | ❌ | ✅ `sock.upch()` |
| AI-Rich Responses (Markdown, Code, Tables) | ❌ | ✅ `sock.airich()` |
| Payments / eWallet / Orders | ❌ | ✅ `sock.payment()` / `sock.ewallet()` / `sock.order()` |
| Link Preview | ❌ | ✅ `sock.linkpreview()` |
| LID-to-PN Mapping | ❌ | ✅ `sock.lidToPn()` / `sock.pnToLid()` |
| Old-Style Button (Location Header) | ❌ | ✅ `sock.locbtn()` |

All of the above are available on the socket **without any manual patching**. Just `import { makeWASocket } from 'Nailys'` and everything is there.

---

# Install

```bash
# via npm
npm install github:NatasssBotzz/Nailys

# via yarn
yarn add github:NatasssBotzz/Nailys

# via bun
bun add github:NatasssBotzz/Nailys
```

Or add to your `package.json`:

```json
{
  "dependencies": {
    "Nailys": "github:NatasssBotzz/Nailys"
  }
}
```

Then import:

```ts
import makeWASocket from 'Nailys'
// or
import { makeWASocket } from 'Nailys'
```

> **Node.js >= 20.0.0 required.**

### Optional Dependencies

For full feature support, install these optional packages:

```bash
npm install sharp fluent-ffmpeg node-webpmux archiver
# or
yarn add sharp fluent-ffmpeg node-webpmux archiver
```

- `sharp` — image processing (stickers, thumbnails, AI-rich media)
- `fluent-ffmpeg` — video/audio conversion (stickers, UPCH audio)
- `node-webpmux` — WebP EXIF metadata (stickers)
- `archiver` — ZIP creation (sticker packs)

---

# Quick Start

```ts
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from 'Nailys'
import { Boom } from '@hapi/boom'

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_Nailys')
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect =
                (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) connectToWhatsApp()
        } else if (connection === 'open') {
            console.log('connected')
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const m of messages) {
            console.log(JSON.stringify(m, undefined, 2))
            await sock.sendMessage(m.key.remoteJid!, { text: 'Hello World' })
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

connectToWhatsApp()
```

---

# Table of Contents

- [Connecting](#connecting)
    - [QR Code](#qr-code)
    - [Pairing Code](#pairing-code)
    - [Custom Pairing Code](#custom-pairing-code)
    - [Receive Full History](#receive-full-history)
- [Saving & Restoring Sessions](#saving--restoring-sessions)
- [Handling Events](#handling-events)
- [WhatsApp IDs](#whatsapp-ids)
- [Sending Messages](#sending-messages)
    - [Text](#text-message)
    - [Quote](#quote-message)
    - [Mention](#mention-user)
    - [Forward](#forward-messages)
    - [Location](#location-message)
    - [Contact](#contact-message)
    - [Reaction](#reaction-message)
    - [Poll](#poll-message)
    - [Media (Image, Video, Audio, GIF)](#media-messages)
    - [View Once](#view-once-message)
- [Modify Messages](#modify-messages)
    - [Delete](#delete-messages)
    - [Edit](#edit-messages)
- [Groups](#groups)
    - [Create / Add / Remove / Promote / Demote](#create-a-group)
    - [Update Subject / Description](#change-subject-name)
    - [Change Settings](#change-settings)
    - [Leave](#leave-a-group)
    - [Invite Codes](#get-invite-code)
    - [Metadata](#query-metadata)
- [Presence & Read Receipts](#presence--read-receipts)
- [Profile Management](#profile-management)
- [Privacy](#privacy)
- [Nailys Native Features](#nailys-native-features)
    - [Pairing (Custom Code)](#nailys-pairing)
    - [Sticker & Sticker Pack](#nailys-sticker)
    - [SWGC (Group Status)](#nailys-swgc)
    - [Interactive Messages (Buttons, Carousel)](#nailys-interactive)
    - [ButtonV2 / locbtn (Location Header)](#nailys-buttonv2)
    - [UPCH (Newsletter / Channel)](#nailys-upch)
    - [AI-Rich Responses](#nailys-airich)
    - [Payment / eWallet / Order](#nailys-payment)
    - [Link Preview](#nailys-linkpreview)
    - [LID-to-PN Mapping](#nailys-lidtopn)
- [Disclaimer](#disclaimer)

---

# Connecting

## QR Code

```ts
import makeWASocket, { Browsers } from 'Nailys'

const sock = makeWASocket({
    browser: Browsers.ubuntu('My App'),
    printQRInTerminal: true
})
```

Scan the QR code with WhatsApp on your phone.

## Pairing Code

```ts
const sock = makeWASocket({
    printQRInTerminal: false // must be false
})

if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode('6281234567890')
    console.log('Pairing code:', code)
}
```

> The phone number should not contain `+`, `()`, or `-`. Country code is required.

## Custom Pairing Code

Nailys adds support for **custom 8-character pairing codes**:

```ts
if (!sock.authState.creds.registered) {
    // Request pairing with custom 8-char code
    const code = await sock.requestPairingCode('6281234567890', 'NATASSBZ')
    console.log('Code:', code) // e.g., "NATA-SSBZ"
}
```

Or use the all-in-one `sock.pairing()` method:

```ts
const code = await sock.pairing({
    phoneNumber: '6281234567890',
    customCode: 'NATASSBZ'
})
```

- Auto-formats `08xx` → `628xx`
- Default custom code: `NATASSBZ`
- Code displayed in `XXXX-XXXX` format

## Receive Full History

```ts
const sock = makeWASocket({
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: true
})
```

---

# Saving & Restoring Sessions

```ts
import makeWASocket, { useMultiFileAuthState } from 'Nailys'

const { state, saveCreds } = await useMultiFileAuthState('auth_info_Nailys')
const sock = makeWASocket({ auth: state })

// save credentials whenever they update
sock.ev.on('creds.update', saveCreds)
```

> When a message is sent/received, auth keys update. Always save them via `creds.update` or messages will fail to deliver.

---

# Handling Events

Nailys uses EventEmitter syntax. All events from Baileys are available:

```ts
sock.ev.on('messages.upsert', ({ messages }) => {
    console.log('new messages', messages)
})

sock.ev.on('messages.update', (updates) => {
    console.log('message updates', updates)
})

sock.ev.on('contacts.upsert', (contacts) => {
    console.log('contacts', contacts)
})

sock.ev.on('groups.upsert', (groups) => {
    console.log('groups', groups)
})

sock.ev.on('group-participants.update', (event) => {
    console.log('participant changes', event)
})

sock.ev.on('presence.update', (presence) => {
    console.log('presence', presence)
})

sock.ev.on('creds.update', saveCreds)
```

---

# WhatsApp IDs

- **People**: `[country code][phone number]@s.whatsapp.net`
  - Example: `6281234567890@s.whatsapp.net`
- **Groups**: `123456789-123345@g.us`
- **Broadcast lists**: `[timestamp]@broadcast`
- **Newsletters / Channels**: `120363424475734781@newsletter`
- **Status**: `status@broadcast`

---

# Sending Messages

All message types are sent via a single function:

```ts
await sock.sendMessage(jid, content, options)
```

## Text Message

```ts
await sock.sendMessage(jid, { text: 'Hello World' })
```

## Quote Message

Works with all message types:

```ts
await sock.sendMessage(jid, { text: 'Hello' }, { quoted: message })
```

## Mention User

```ts
await sock.sendMessage(jid, {
    text: '@6281234567890 hello',
    mentions: ['6281234567890@s.whatsapp.net']
})
```

## Forward Messages

```ts
await sock.sendMessage(jid, { forward: message })
```

## Location Message

```ts
await sock.sendMessage(jid, {
    location: {
        degreesLatitude: 24.121231,
        degreesLongitude: 55.1121221
    }
})
```

## Contact Message

```ts
const vcard = 'BEGIN:VCARD\n'
    + 'VERSION:3.0\n'
    + 'FN:John Doe\n'
    + 'TEL;type=CELL;type=VOICE;waid=6281234567890:+62 812 3456 7890\n'
    + 'END:VCARD'

await sock.sendMessage(jid, {
    contacts: {
        displayName: 'John',
        contacts: [{ vcard }]
    }
})
```

## Reaction Message

```ts
await sock.sendMessage(jid, {
    react: {
        text: '❤️',      // use '' to remove reaction
        key: message.key
    }
})
```

## Poll Message

```ts
await sock.sendMessage(jid, {
    poll: {
        name: 'My Poll',
        values: ['Option 1', 'Option 2', 'Option 3'],
        selectableCount: 1,
        toAnnouncementGroup: false
    }
})
```

## Media Messages

Sending media is efficient — Nailys never loads entire files into memory, it encrypts streams directly.

### Image

```ts
await sock.sendMessage(jid, {
    image: { url: './image.png' },
    caption: 'My image'
})
```

### Video

```ts
await sock.sendMessage(jid, {
    video: { url: './video.mp4' },
    caption: 'My video',
    ptv: false // set true for video note
})
```

### Audio

```ts
await sock.sendMessage(jid, {
    audio: { url: './audio.mp3' },
    mimetype: 'audio/mp4'
})
```

### GIF

```ts
await sock.sendMessage(jid, {
    video: fs.readFileSync('media.gif.mp4'),
    caption: 'My GIF',
    gifPlayback: true
})
```

### View Once Message

```ts
await sock.sendMessage(jid, {
    image: { url: './secret.png' },
    viewOnce: true,   // works with video & audio too
    caption: 'View once'
})
```

---

# Modify Messages

## Delete Messages

```ts
const msg = await sock.sendMessage(jid, { text: 'hello' })
await sock.sendMessage(jid, { delete: msg.key })
```

## Edit Messages

```ts
await sock.sendMessage(jid, {
    text: 'updated text',
    edit: msg.key
})
```

---

# Groups

## Create a Group

```ts
const group = await sock.groupCreate('My Group', [
    '6281234567890@s.whatsapp.net',
    '6289876543210@s.whatsapp.net'
])
console.log('Group ID:', group.gid)
```

## Add / Remove / Promote / Demote

```ts
await sock.groupParticipantsUpdate(
    jid,
    ['628xxx@s.whatsapp.net'],
    'add' // or 'remove' | 'promote' | 'demote'
)
```

## Change Subject (Name)

```ts
await sock.groupUpdateSubject(jid, 'New Name')
```

## Change Description

```ts
await sock.groupUpdateDescription(jid, 'New Description')
```

## Change Settings

```ts
// only admins can send messages
await sock.groupSettingUpdate(jid, 'announcement')

// everyone can send messages
await sock.groupSettingUpdate(jid, 'not_announcement')

// everyone can edit group settings
await sock.groupSettingUpdate(jid, 'unlocked')

// only admins can edit group settings
await sock.groupSettingUpdate(jid, 'locked')
```

## Leave a Group

```ts
await sock.groupLeave(jid)
```

## Get Invite Code

```ts
const code = await sock.groupInviteCode(jid)
console.log('Invite link:', 'https://chat.whatsapp.com/' + code)
```

## Revoke Invite Code

```ts
const code = await sock.groupRevokeInvite(jid)
```

## Join via Invite Code

```ts
await sock.groupAcceptInvite('inviteCodeHere')
```

## Query Metadata

```ts
const metadata = await sock.groupMetadata(jid)
console.log(metadata.subject, metadata.desc, metadata.participants)
```

## Get All Participating Groups

```ts
const groups = await sock.groupFetchAllParticipating()
```

---

# Presence & Read Receipts

## Read Messages

```ts
await sock.readMessages([message.key])
```

## Update Presence

```ts
await sock.sendPresenceUpdate('available', jid)   // online
await sock.sendPresenceUpdate('composing', jid)    // typing
await sock.sendPresenceUpdate('unavailable', jid)  // offline
```

---

# Profile Management

```ts
// Change status
await sock.updateProfileStatus('Hello World!')

// Change name
await sock.updateProfileName('My Name')

// Change profile picture
await sock.updateProfilePicture(jid, { url: './photo.jpg' })

// Remove profile picture
await sock.removeProfilePicture(jid)

// Get profile picture URL
const ppUrl = await sock.profilePictureUrl(jid)

// Get business profile
const biz = await sock.getBusinessProfile(jid)
```

---

# Privacy

```ts
// Block / Unblock
await sock.updateBlockStatus(jid, 'block')
await sock.updateBlockStatus(jid, 'unblock')

// Update privacy settings
await sock.updateLastSeenPrivacy('all')           // all | contacts | contact_blacklist | none
await sock.updateOnlinePrivacy('all')              // all | match_last_seen
await sock.updateProfilePicturePrivacy('contacts')
await sock.updateStatusPrivacy('contacts')
await sock.updateReadReceiptsPrivacy('all')        // all | none
await sock.updateGroupsAddPrivacy('contacts')
```

---

# Nailys Native Features

All features below are available directly on the socket — **no imports, no patches, no disk hacks**.

---

## Nailys Pairing

Custom pairing code support with auto phone-number formatting.

```ts
// All-in-one pairing
const code = await sock.pairing({
    phoneNumber: '6281234567890',
    customCode: 'NATASSBZ'  // optional, default: NATASSBZ
})

// Standard + custom
await sock.requestPairingCode('6281234567890', 'NATASSBZ')

// Custom code only (8 chars A-Z, 0-9)
await sock.requestCustomPairingCode('6281234567890', 'NATASSBZ')
```

**Helpers (also exported from Nailys):**

```ts
import {
    normalizePhoneNumber,        // '08xx' → '628xx'
    formatPairingCode,           // 'NATASSBZ' → 'NATA-SSBZ'
    DEFAULT_CUSTOM_PAIRING_CODE  // 'NATASSBZ'
} from 'Nailys'
```

| Method | Description |
|---|---|
| `sock.pairing(opts)` | All-in-one: prompts for number if empty, returns formatted code |
| `sock.requestPairingCode(phone, code?)` | Standard pairing. With optional custom code |
| `sock.requestCustomPairingCode(phone, code)` | Custom 8-character code pairing |

---

## Nailys Sticker

Native sticker & sticker pack builder — image/video → WebP conversion, EXIF injection, AI stickers, private/premium stickers.

### `sock.sendSticker(jid, options)`

```ts
await sock.sendSticker(jid, {
    media,           // URL | path | Buffer | Message
    packname,        // sticker pack name
    author,          // sticker author
    type,            // 1 = normal, 2 = private/locked, 3 = premium
    ai,              // true = AI sticker label
    quoted           // quoted message
})
```

| `type` | Description |
|:------:|-------------|
| `1` | Normal Sticker |
| `2` | Private / Locked Sticker (limitSharing) |
| `3` | Premium Sticker |

Supported media sources: URL, local file path, Buffer, Message object, quoted message.

```ts
// From URL
await sock.sendSticker(from, {
    media: 'https://example.com/image.jpg',
    packname: 'My Pack',
    author: 'Bot',
    type: 1
})

// From reply media
await sock.sendSticker(from, {
    media: m.quoted,
    packname: 'Pack',
    author: 'Bot'
})

// Premium sticker
await sock.sendSticker(from, {
    media: buffer,
    packname: 'Premium',
    author: 'VIP',
    type: 3
})
```

### `sock.sendStickerPack(jid, options)`

Send a **sticker pack** (up to 30 stickers per message, auto-batched):

```ts
await sock.sendStickerPack(from, {
    name: 'My Pack',
    publisher: 'Bot',
    packname: 'Stickers',
    author: 'Author',
    type: 1,
    ai: false,
    stickers: [
        { media: 'https://example.com/img1.jpg' },
        { media: './img2.png', type: 3 },
        { media: buffer, ai: true },
        { media: m.quoted }
    ]
})
```

| Parameter | Type | Description |
|---|---|---|
| `name` | String | Pack display name |
| `publisher` | String | Publisher name |
| `packname` | String | Sticker pack watermark |
| `author` | String | Author watermark |
| `type` | Number | 1 = normal, 2 = private, 3 = premium |
| `ai` | Boolean | AI sticker label |
| `stickers` | Array | Array of sticker sources |
| `quoted` | Message | Quoted message |

---

## Nailys SWGC

**WhatsApp Status Group Content** — send status-like messages to groups with text formatting, images, videos, voice notes, and audience control.

### Quick Usage

```ts
// Text status
await sock.swgc(groupJid, 'Hello everyone!')

// Image status
await sock.swgc(groupJid, {
    type: 'image',
    buffer: imageBuffer,
    caption: 'Check this out'
})

// Video status
await sock.swgc(groupJid, {
    type: 'video',
    buffer: videoBuffer,
    caption: 'Watch this'
})

// Voice note
await sock.swgc(groupJid, {
    type: 'audio',
    buffer: audioBuffer,
    mimetype: 'audio/ogg; codecs=opus',
    ptt: true
})
```

### Builder API — `sock.swgcBuilder(jid)`

```ts
await sock.swgcBuilder(groupJid)
    .text('Hello World')
    .color('putih')          // text color
    .bgcolor('merahtua')     // background color
    .font('fancy')           // font style
    .audience('custom', 'Close Friends', '❤️')
    .send()

// Image
await sock.swgcBuilder(groupJid)
    .image(buffer)
    .caption('Photo caption')
    .send()

// Video
await sock.swgcBuilder(groupJid)
    .video(buffer)
    .caption('Video caption')
    .send()

// Voice Note
await sock.swgcBuilder(groupJid)
    .video(buffer, 'audio/ogg; codecs=opus', { ptt: true })
    .send()
```

### Audience Control

```ts
// Close Friends
.swgcBuilder(jid).text('Hello').audience('close_friends').send()

// Custom List
.swgcBuilder(jid).text('Hello').audience('custom', 'List Name', '🎉').send()
```

### Automatic Media Detection

```ts
// Auto-detect from replied message
const payload = await sock.createStatusPayloadFromInput(m)
await sock.swgc(groupJid, payload)

// With custom text
const payload = await sock.createStatusPayloadFromInput(m, 'My caption')
await sock.swgc(groupJid, payload)
```

### Fonts

| Name | ID |
|------|---:|
| sans | 1 |
| serif | 2 |
| mono | 3 |
| cursive | 4 |
| fancy | 5 |

### Colors

| Name | Hex |
|------|-----|
| putih | `#FFFFFF` |
| hitam | `#000000` |
| merah | `#FF0000` |
| hijau | `#00FF00` |
| biru | `#0000FF` |
| kuning | `#FFFF00` |
| pink | `#FF69B4` |
| ungu | `#800080` |
| orange | `#FFA500` |
| abu | `#808080` |
| cyan | `#00FFFF` |
| tosca | `#008080` |
| coklat | `#8B4513` |
| emas | `#FFD700` |
| silver | `#C0C0C0` |
| merahtua | `#8B0000` |
| birutua | `#00008B` |
| hijautua | `#006400` |
| lavender | `#E6E6FA` |

Also supports raw HEX values (without `#`):

```ts
sock.resolveColor('#ff0000')  // → 0xFFFF0000
sock.resolveFont('fancy')     // → 5
sock.COLORS                   // color map object
```

---

## Nailys Interactive

Native interactive message builders — buttons, bottom sheets, limited-time offers, carousels, and booking forms.

### `sock.button()` — InteractiveBuilder

```ts
await sock.button()
    .setTitle('Menu Utama')
    .setBody('Silakan pilih opsi di bawah:')
    .setFooter('© My Bot')
    .setContextInfo({
        stanzaId: m.key.id,
        participant: m.key.participant || m.key.remoteJid,
        quotedMessage: m.message
    })
    // Quick Reply button
    .qreplybtn('display: Profile', 'value: .profile')
    // CTA Copy button
    .copybtn('display: Copy Code', 'code: ABC-123', 'icon: PROMOTION')
    // CTA URL button
    .urlbtn('display: Website', 'url: https://example.com')
    // CTA Call button
    .callbtn('display: Call CS', 'phone: 628123456789')
    // Galaxy/Native Flow button
    .galaxybtn('Feedback', 'SATISFACTION_SCREEN')
    // List button
    .listbtn('display: Menu', [
        {
            title: 'Category',
            rows: [
                { title: 'Option A', description: 'Description', id: '.opta' },
                { title: 'Option B', description: 'Description', id: '.optb' }
            ]
        }
    ])
    .send(from)
```

### Bottom Sheet

```ts
await sock.button()
    .setTitle('Services')
    .setBody('Click below to see options.')
    .bottomsheet('Main Menu', 'Open Menu', 2, [1, 5])
    .qreplybtn('display: Start', 'value: .start')
    .qreplybtn('display: Help', 'value: .help')
    .copybtn('display: Token', 'code: XYZ')
    .urlbtn('display: Web', 'url: https://example.com')
    .callbtn('display: Call', 'phone: 628123456789')
    .send(from)
```

**`.bottomsheet(title, buttonText, inThreadButtons, dividerIndices)`**

| Param | Description |
|---|---|
| `title` | Header text in bottom sheet |
| `buttonText` | Trigger button label |
| `inThreadButtons` | Buttons shown inline (0-2) |
| `dividerIndices` | Divider positions (1-based) |

### Limited Time Offer

```ts
await sock.button()
    .setBody('Special promo!')
    .offer('display: Flash Sale', 'copy: PROMO50', 'url: https://shop.com', 'exp: day')
    .send(from)
```

Expiration values: `day`, `week`, `month`, `year`, `exp` (expired), or empty (no expiration).

### Booking

```ts
await sock.button()
    .setTitle('Book Now')
    .setBody('Schedule your appointment.')
    .bookingbtn('display: Book Now', {
        start_datetime: '2026-06-22T08:00:00.000Z',
        end_datetime: '2026-06-22T09:00:00.000Z',
        location: 'Jakarta, Indonesia',
        booking_url: 'https://example.com/book',
        phone_number: '628123456789',
        description: 'Consultation session',
        email: 'user@example.com',
        display_content: {
            display_language: 'id',
            display_meeting_type: 'Consultation',
            display_bottom_sheet_header: 'Select Time'
        }
    })
    .send(from)
```

### `sock.carouselBuilder()` — Carousel

```ts
const defaultMedia = { image: { url: 'https://placehold.co/600x400/png' } }

const card1 = await sock.cardBuilder()
    .setTitle('Card 1')
    .setBody('Card 1 body')
    .setFooter('Footer 1')
    .setMedia(defaultMedia)
    .qreplybtn('display: Action', 'value: .action1')
    .offer('text: Limited Offer', 'exp: day')
    .build()

const card2 = await sock.cardBuilder()
    .setTitle('Card 2')
    .setBody('Card 2 body')
    .setMedia(defaultMedia)
    .urlbtn('display: Visit', 'url: https://example.com')
    .build()

await sock.carouselBuilder()
    .setBody('Main carousel message')
    .setFooter('Footer text')
    .setContextInfo({
        stanzaId: m.key.id,
        participant: m.key.participant || m.key.remoteJid,
        quotedMessage: m.message
    })
    .addcard(card1, card2)
    .send(from)
```

### Native Methods Summary

| Method | Builder | Purpose |
|---|---|---|
| `sock.button()` | InteractiveBuilder | Interactive button messages |
| `sock.carouselBuilder()` | CarouselBuilder | Multi-card carousel |
| `sock.cardBuilder()` | CarouselCardBuilder | Single card for carousel |
| `sock.buildButtons(buttons)` | — | Utility: build button array |

---

## Nailys ButtonV2

**Old-style button messages with location header** — `sock.locbtn()`.

```ts
// Basic quick reply
await sock.locbtn()
    .setBody('Choose an option:')
    .setFooter('Footer text')
    .locreply('👤 Profile', '.profile')
    .locreply('⚙️ Settings', '.settings')
    .send(from, { quoted: m })

// With location header + thumbnail
await sock.locbtn()
    .setLocationThumbnailFromQuoted(quotedMessage)
    .setTitle('📍 My Location')
    .setSubtitle('Jl. Example No. 123')
    .setBody('Here is my location')
    .locreply('📍 Ping', '.ping')
    .locreply('📋 Menu', '.menu')
    .send(from, { quoted: m })

// List button (single select)
await sock.locbtn()
    .setBody('Select menu:')
    .loclist({
        buttonText: { displayText: '📋 Menu' },
        buttonId: 'menu_select',
        type: 1,
        nativeFlowInfo: {
            name: 'single_select',
            paramsJson: JSON.stringify({
                title: 'Menu List',
                sections: [{
                    title: 'Category',
                    rows: [
                        { title: 'Option 1', description: 'Desc', id: '.opt1' },
                        { title: 'Option 2', description: 'Desc', id: '.opt2' }
                    ]
                }]
            })
        }
    })
    .send(from, { quoted: m })
```

| Method | Description |
|---|---|
| `setTitle(title)` | Location header title |
| `setSubtitle(subtitle)` | Location header subtitle |
| `setBody(text)` | Body text |
| `setFooter(text)` | Footer text |
| `setThumbnail(url\|buffer)` | Set thumbnail |
| `setLocationThumbnailFromBuffer(buffer)` | Thumbnail from buffer |
| `setLocationThumbnailFromUrl(url)` | Thumbnail from URL |
| `setLocationThumbnailFromQuoted(quoted)` | Thumbnail from reply |
| `locreply(display, id)` | Quick reply button |
| `loclist(obj)` | List/select button |

---

## Nailys UPCH

**Newsletter / Channel posting** — `sock.upch()`. Send images, videos, audio (with 4-step ffmpeg conversion to OGG Opus), and PTV (Picture-in-Picture Video) to WhatsApp Channels.

```ts
// Send image to channel
await sock.upch()
    .image(buffer)
    .caption('Amazing photo!')
    .sendch('120363424475734781@newsletter')

// Send video to channel
await sock.upch()
    .video(buffer)
    .caption('Watch this!')
    .sendch('120363424475734781@newsletter')

// Send audio to channel (auto converts to OGG Opus)
await sock.upch()
    .audio(buffer)
    .caption('Voice message')
    .sendch('120363424475734781@newsletter')

// Send PTV to chat
await sock.upch()
    .video(buffer, { ptv: true })
    .caption('PTV video')
    .send(chatJid, { quoted: m })

// Send from replied media (auto-detect)
await sock.upch()
    .caption('My caption')
    .sendch('120xxx@newsletter', { quotedMessage: m })
```

### Audio Pipeline

Audio is automatically processed through a 4-step ffmpeg pipeline before being sent to channels:

1. Input → MP3
2. MP3 → Opus (libopus)
3. Opus → MP3
4. MP3 → OGG Opus final (48kHz, 64kbps)

### Helper

```ts
// Normalize newsletter JID
const jid = sock.normalizeNewsletterJid('120363424475734781')
// → '120363424475734781@newsletter'

// From invite link
const jid = sock.normalizeNewsletterJid('https://whatsapp.com/channel/0029Va...')
```

---

## Nailys AI-Rich

**AI-style rich responses** — `sock.airich()`. Build complex messages with markdown text, code blocks, tables, images, videos, posts, reels, products, and suggestions — all chained fluently.

```ts
await sock.airich()
    .addText('Hello! This supports [links](https://example.com) and **markdown**.')
    .addCode('javascript', `console.log("Hello World");`)
    .addTable([
        ['Feature', 'Status'],
        ['Code Block', '✅ Active'],
        ['Media Post', '✅ Active']
    ])
    .addTip('Make sure your input is valid.')
    .addSuggest('Show main menu')
    .send(from, { quoted: m })
```

### All Methods

| Method | Description |
|---|---|
| `.addText(text, opts?)` | Markdown text with auto link/citation/latex parsing |
| `.addCode(language, code)` | Code block with syntax highlighting |
| `.addTable(data, opts?)` | Table with headers and rows |
| `.addImage(url, opts?)` | Image embed |
| `.addVideo(url, opts?)` | Video embed |
| `.addPost(posts)` | Social-media style post cards (supports carousel) |
| `.addProduct(product)` | E-commerce product card (single or carousel) |
| `.addReels(reels)` | Short video reel cards |
| `.addSource(sources)` | Reference/source citations |
| `.addTip(text)` | Tip/note element |
| `.addSuggest(text)` | Quick suggestion button |
| `.setTitle(title)` | Response title |
| `.setFooter(footer)` | Response footer |
| `.setContextInfo(obj)` | Context info (reply metadata) |
| `.send(jid, opts?)` | Send the rich response |

### Post Example

```ts
await sock.airich()
    .addPost([{
        profile: 'https://example.com/avatar.jpg',
        username: 'user',
        title: 'Post Title',
        subtitle: 'SUBTITLE',
        caption: 'This is a post description.',
        verified: true,
        url: 'https://example.com/post',
        thumbnail: 'https://example.com/thumb.jpg',
        source: 'INSTAGRAM',
        footer: 'footer text'
    }])
    .send(from, { quoted: m })
```

### Product Example

```ts
await sock.airich()
    .addProduct({
        title: 'Product Name',
        brand: 'Brand',
        price: 'Rp 100.000',
        sale_price: 'Rp 75.000',
        url: 'https://shop.com/product',
        image: 'https://example.com/product.jpg'
    })
    .send(from, { quoted: m })
```

---

## Nailys Payment

Native payment & order message builders.

### `sock.payment()` — PaymentBuilder

```ts
await sock.payment()
    .body('Order details')
    .footer('Thank you')
    .amount(20000000, 100)   // value/offset = Rp 200.000
    .reference('REF-123')
    .type('digital-goods')
    .status('captured')
    .orderDescription('Premium package purchase')
    .tax(8, 100)
    .discount(6400, 100)
    .shipping(4, 100)
    .item({
        retailer_id: 'PROD-1',
        name: 'Premium Package',
        value: 900000,
        offset: 100,
        quantity: 1
    })
    .nativePaymentMethods([{ name: 'PIX', enabled: false }])
    .shareStatus(true)
    .send(from, { quoted: m })
```

### `sock.ewallet(name)` — EWalletBuilder

```ts
await sock.ewallet('dana')
    .key('087873384161')
    .name('DANA')
    .institution('DANA')
    .fullName('John Doe')
    .accountType('wallet')
    .amount(50000, 100)   // Rp 500
    .reference('DANA-123')
    .item({ name: 'Donation', value: 50000, offset: 100, quantity: 1 })
    .send(from, { quoted: m })
```

Supported wallets: `dana`, `gopay`, `ovo`, `linkaja`, `seabank`, `qris`, `shopepay`.

### `sock.order()` — OrderBuilder

```ts
await sock.order()
    .orderId('INV-1781789438996')
    .orderTitle('Premium Package')
    .sellerJid('6281330586274:85@s.whatsapp.net')
    .token('INV-TOKEN-1781789438996')
    .totalAmountRaw(50000000)  // totalAmount1000 = 50000000 → Rp 50.000
    .currency('IDR')
    .message('Thank you for your purchase!')
    .itemCount(1)
    .status(1)
    .surface(1)
    .send(from, { quoted: m })

// With profile picture as thumbnail
await sock.order()
    .orderId('INV-123')
    .orderTitle('Package')
    .sellerJid('628xxx:85@s.whatsapp.net')
    .token('TOKEN')
    .totalAmountRaw(50000000)
    .currency('IDR')
    .message('Thanks!')
    .thumbnailFromProfile('628xxx@s.whatsapp.net')
    .send(from, { quoted: m })
```

> `totalAmount1000` = price × 1000. Example: Rp 50.000 → `totalAmount1000: 50000000`.

---

## Nailys LinkPreview

**Link preview builder** — `sock.linkpreview()`.

> Link preview **cannot** be combined with buttons, interactive, or rich media — this is a WhatsApp protocol limitation.

```ts
// Basic small preview
await sock.linkpreview()
    .image(buffer)
    .link('https://example.com')
    .title('Example Title')
    .description('Preview description')
    .type('small')
    .text('Check this link!')
    .send(from, { quoted: m })

// High quality (big) preview
await sock.linkpreview()
    .image(buffer)
    .link('https://example.com')
    .title('Example Title')
    .description('Preview description')
    .type('big')
    .text('Check this link!')
    .send(from, { quoted: m })

// Auto-fetch image from URL
await sock.linkpreview()
    .image('https://example.com/thumb.jpg')
    .link('https://example.com')
    .title('Example')
    .description('Auto-fetched')
    .type('small')
    .text('Check this link!')
    .send(from, { quoted: m })
```

| Method | Description |
|---|---|
| `.image(Buffer\|string)` | Thumbnail image |
| `.text(string)` | Caption text (auto-appends link if missing) |
| `.link(string)` | URL to preview |
| `.title(string)` | Preview title |
| `.description(string)` | Preview description |
| `.type('small'\|'big')` | `small` = raw buffer. `big` = server upload (higher quality) |
| `.send(jid, options)` | Send the link preview |

- `type('big')` uploads to WhatsApp server for higher quality.
- `type('small')` uses local raw buffer as `jpegThumbnail`.

---

## Nailys LID-to-PN

**LID (Linked Device ID) ↔ Phone Number mapping** — `sock.lidToPn()` / `sock.pnToLid()`.

Automatically learns mappings from contacts, messages, and group participants. Persisted to `./database/lid-map.json`.

```ts
// Convert LID to phone number JID
const pn = await sock.lidToPn('251895939637299@s.whatsapp.net')
// → '6287873384161@s.whatsapp.net'

// Convert phone number to LID
const lid = await sock.pnToLid('6287873384161@s.whatsapp.net')
// → '251895939637299@s.whatsapp.net'

// Resolve any JID to PN (with group learning)
const resolved = await sock.resolveAnyJidToPn('251895939637299@s.whatsapp.net', groupJid)
```

| Method | Description |
|---|---|
| `sock.lidToPn(jid)` | Resolve LID → Phone Number JID |
| `sock.pnToLid(jid)` | Resolve Phone Number JID → LID |
| `sock.resolveAnyJidToPn(jid, chatJid?)` | Auto-resolve any JID to PN, with group learning |
| `sock.toPn(jid)` | Alias for `lidToPn` |
| `sock.toLid(jid)` | Alias for `pnToLid` |
| `sock.learnLidPn(data)` | Manually teach a mapping |

---

# Utility Exports

Nailys also exports all utility functions from Baileys:

```ts
import {
    // Auth
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    
    // Constants
    DisconnectReason,
    Browsers,
    DEFAULT_CUSTOM_PAIRING_CODE,
    
    // Messages
    downloadMediaMessage,
    downloadContentFromMessage,
    getContentType,
    generateWAMessageFromContent,
    prepareWAMessageMedia,
    
    // JID utils
    jidNormalizedUser,
    jidEncode,
    isJidNewsletter,
    
    // Device
    getDevice,
    
    // Pairing helpers
    normalizePhoneNumber,
    formatPairingCode,
    bytesToCrockford,
    
    // Sticker helpers
    writeExif,
    writeExifImg,
    writeExifVid,
    readWebpExifJson,
    imageToWebp,
    videoToWebp,
    
    // And more...
} from 'Nailys'
```

---

# Disclaimer

This project is not affiliated, associated, authorized, endorsed by, or in any way officially connected with WhatsApp or any of its subsidiaries or its affiliates. The official WhatsApp website can be found at whatsapp.com. "WhatsApp" as well as related names, marks, emblems and images are registered trademarks of their respective owners.

Use at your own discretion. Do not spam people with this. We discourage any stalkerware, bulk or automated messaging usage.
