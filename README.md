<h1 align='center'>Nailys</h1>

<div align='center'>A WebSockets-based TypeScript library for interacting with the WhatsApp Web API — with native builders for stickers, interactive messages, payments, newsletters, AI-rich responses, and more.</div>

<div align='center'>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)

</div>

> **Nailys** — all common bot features (sticker builders, interactive messages, newsletter/channel posting, SWGC, payments, AI-rich responses, and more) are built directly into the socket. No manual patching, no extra imports.

---

# Important Note

This is the official README for Nailys — a Baileys fork maintained by [NatasssBotzz](https://github.com/NatasssBotzz). All features from the original Baileys are preserved and extended with native builders.

Original Baileys docs: https://baileys.wiki

Original Baileys Discord: https://discord.gg/WeJM5FP9GG

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
    const Nailys = makeWASocket({
        auth: state,
        printQRInTerminal: true
    })

    Nailys.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect =
                (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) connectToWhatsApp()
        } else if (connection === 'open') {
            console.log('connected')
        }
    })

    Nailys.ev.on('messages.upsert', async ({ messages }) => {
        for (const m of messages) {
            console.log(JSON.stringify(m, undefined, 2))
            await Nailys.sendMessage(m.key.remoteJid!, { text: 'Hello World' })
        }
    })

    Nailys.ev.on('creds.update', saveCreds)
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
- [Pairing (Custom Code)](#pairing)
    - [Sticker & Sticker Pack](#sticker)
    - [SWGC (Group Status)](#swgc)
    - [Interactive Messages (Buttons, Carousel)](#interactive-messages)
    - [ButtonV2 / locbtn (Location Header)](#buttonv2)
    - [UPCH (Newsletter / Channel)](#upch)
    - [AI-Rich Responses](#ai-rich)
    - [Payment / eWallet / Order](#payment)
    - [Link Preview](#link-preview)
    - [LID-to-PN Mapping](#lid-to-pn)
- [Disclaimer](#disclaimer)

---

# Connecting

## QR Code

```ts
import makeWASocket, { Browsers } from 'Nailys'

const Nailys = makeWASocket({
    browser: Browsers.ubuntu('My App'),
    printQRInTerminal: true
})
```

Scan the QR code with WhatsApp on your phone.

## Pairing Code

```ts
const Nailys = makeWASocket({
    printQRInTerminal: false // must be false
})

if (!Nailys.authState.creds.registered) {
    const code = await Nailys.requestPairingCode('6281234567890')
    console.log('Pairing code:', code)
}
```

> The phone number should not contain `+`, `()`, or `-`. Country code is required.

## Custom Pairing Code

Nailys adds support for **custom 8-character pairing codes**:

```ts
if (!Nailys.authState.creds.registered) {
    // Request pairing with custom 8-char code
    const code = await Nailys.requestPairingCode('6281234567890', 'NATASSBZ')
    console.log('Code:', code) // e.g., "NATA-SSBZ"
}
```

Or use the all-in-one `Nailys.pairing()` method:

```ts
const code = await Nailys.pairing({
    phoneNumber: '6281234567890',
    customCode: 'NATASSBZ'
})
```

- Auto-formats `08xx` → `628xx`
- Default custom code: `NATASSBZ`
- Code displayed in `XXXX-XXXX` format

## Receive Full History

```ts
const Nailys = makeWASocket({
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: true
})
```

---

# Saving & Restoring Sessions

```ts
import makeWASocket, { useMultiFileAuthState } from 'Nailys'

const { state, saveCreds } = await useMultiFileAuthState('auth_info_Nailys')
const Nailys = makeWASocket({ auth: state })

// save credentials whenever they update
Nailys.ev.on('creds.update', saveCreds)
```

> When a message is sent/received, auth keys update. Always save them via `creds.update` or messages will fail to deliver.

---

# Handling Events

Nailys uses EventEmitter syntax. All events from Baileys are available:

```ts
Nailys.ev.on('messages.upsert', ({ messages }) => {
    console.log('new messages', messages)
})

Nailys.ev.on('messages.update', (updates) => {
    console.log('message updates', updates)
})

Nailys.ev.on('contacts.upsert', (contacts) => {
    console.log('contacts', contacts)
})

Nailys.ev.on('groups.upsert', (groups) => {
    console.log('groups', groups)
})

Nailys.ev.on('group-participants.update', (event) => {
    console.log('participant changes', event)
})

Nailys.ev.on('presence.update', (presence) => {
    console.log('presence', presence)
})

Nailys.ev.on('creds.update', saveCreds)
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
await Nailys.sendMessage(jid, content, options)
```

## Text Message

```ts
await Nailys.sendMessage(jid, { text: 'Hello World' })
```

## Quote Message

Works with all message types:

```ts
await Nailys.sendMessage(jid, { text: 'Hello' }, { quoted: message })
```

## Mention User

```ts
await Nailys.sendMessage(jid, {
    text: '@6281234567890 hello',
    mentions: ['6281234567890@s.whatsapp.net']
})
```

## Forward Messages

```ts
await Nailys.sendMessage(jid, { forward: message })
```

## Location Message

```ts
await Nailys.sendMessage(jid, {
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

await Nailys.sendMessage(jid, {
    contacts: {
        displayName: 'John',
        contacts: [{ vcard }]
    }
})
```

## Reaction Message

```ts
await Nailys.sendMessage(jid, {
    react: {
        text: '❤️',      // use '' to remove reaction
        key: message.key
    }
})
```

## Poll Message

```ts
await Nailys.sendMessage(jid, {
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
await Nailys.sendMessage(jid, {
    image: { url: './image.png' },
    caption: 'My image'
})
```

### Video

```ts
await Nailys.sendMessage(jid, {
    video: { url: './video.mp4' },
    caption: 'My video',
    ptv: false // set true for video note
})
```

### Audio

```ts
await Nailys.sendMessage(jid, {
    audio: { url: './audio.mp3' },
    mimetype: 'audio/mp4'
})
```

### GIF

```ts
await Nailys.sendMessage(jid, {
    video: fs.readFileSync('media.gif.mp4'),
    caption: 'My GIF',
    gifPlayback: true
})
```

### View Once Message

```ts
await Nailys.sendMessage(jid, {
    image: { url: './secret.png' },
    viewOnce: true,   // works with video & audio too
    caption: 'View once'
})
```

---

# Modify Messages

## Delete Messages

```ts
const msg = await Nailys.sendMessage(jid, { text: 'hello' })
await Nailys.sendMessage(jid, { delete: msg.key })
```

## Edit Messages

```ts
await Nailys.sendMessage(jid, {
    text: 'updated text',
    edit: msg.key
})
```

---

# Groups

## Create a Group

```ts
const group = await Nailys.groupCreate('My Group', [
    '6281234567890@s.whatsapp.net',
    '6289876543210@s.whatsapp.net'
])
console.log('Group ID:', group.gid)
```

## Add / Remove / Promote / Demote

```ts
await Nailys.groupParticipantsUpdate(
    jid,
    ['628xxx@s.whatsapp.net'],
    'add' // or 'remove' | 'promote' | 'demote'
)
```

## Change Subject (Name)

```ts
await Nailys.groupUpdateSubject(jid, 'New Name')
```

## Change Description

```ts
await Nailys.groupUpdateDescription(jid, 'New Description')
```

## Change Settings

```ts
// only admins can send messages
await Nailys.groupSettingUpdate(jid, 'announcement')

// everyone can send messages
await Nailys.groupSettingUpdate(jid, 'not_announcement')

// everyone can edit group settings
await Nailys.groupSettingUpdate(jid, 'unlocked')

// only admins can edit group settings
await Nailys.groupSettingUpdate(jid, 'locked')
```

## Leave a Group

```ts
await Nailys.groupLeave(jid)
```

## Get Invite Code

```ts
const code = await Nailys.groupInviteCode(jid)
console.log('Invite link:', 'https://chat.whatsapp.com/' + code)
```

## Revoke Invite Code

```ts
const code = await Nailys.groupRevokeInvite(jid)
```

## Join via Invite Code

```ts
await Nailys.groupAcceptInvite('inviteCodeHere')
```

## Query Metadata

```ts
const metadata = await Nailys.groupMetadata(jid)
console.log(metadata.subject, metadata.desc, metadata.participants)
```

## Get All Participating Groups

```ts
const groups = await Nailys.groupFetchAllParticipating()
```

---

# Presence & Read Receipts

## Read Messages

```ts
await Nailys.readMessages([message.key])
```

## Update Presence

```ts
await Nailys.sendPresenceUpdate('available', jid)   // online
await Nailys.sendPresenceUpdate('composing', jid)    // typing
await Nailys.sendPresenceUpdate('unavailable', jid)  // offline
```

---

# Profile Management

```ts
// Change status
await Nailys.updateProfileStatus('Hello World!')

// Change name
await Nailys.updateProfileName('My Name')

// Change profile picture
await Nailys.updateProfilePicture(jid, { url: './photo.jpg' })

// Remove profile picture
await Nailys.removeProfilePicture(jid)

// Get profile picture URL
const ppUrl = await Nailys.profilePictureUrl(jid)

// Get business profile
const biz = await Nailys.getBusinessProfile(jid)
```

---

# Privacy

```ts
// Block / Unblock
await Nailys.updateBlockStatus(jid, 'block')
await Nailys.updateBlockStatus(jid, 'unblock')

// Update privacy settings
await Nailys.updateLastSeenPrivacy('all')           // all | contacts | contact_blacklist | none
await Nailys.updateOnlinePrivacy('all')              // all | match_last_seen
await Nailys.updateProfilePicturePrivacy('contacts')
await Nailys.updateStatusPrivacy('contacts')
await Nailys.updateReadReceiptsPrivacy('all')        // all | none
await Nailys.updateGroupsAddPrivacy('contacts')
```

---

## Pairing

Custom pairing code support with auto phone-number formatting.

```ts
// All-in-one pairing
const code = await Nailys.pairing({
    phoneNumber: '6281234567890',
    customCode: 'NATASSBZ'  // optional, default: NATASSBZ
})

// Standard + custom
await Nailys.requestPairingCode('6281234567890', 'NATASSBZ')

// Custom code only (8 chars A-Z, 0-9)
await Nailys.requestCustomPairingCode('6281234567890', 'NATASSBZ')
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
| `Nailys.pairing(opts)` | All-in-one: prompts for number if empty, returns formatted code |
| `Nailys.requestPairingCode(phone, code?)` | Standard pairing. With optional custom code |
| `Nailys.requestCustomPairingCode(phone, code)` | Custom 8-character code pairing |

---

## Sticker

Image/video → WebP conversion, EXIF injection, AI stickers, private/premium stickers.

### `Nailys.sendSticker(jid, options)`

```ts
await Nailys.sendSticker(jid, {
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
await Nailys.sendSticker(from, {
    media: 'https://example.com/image.jpg',
    packname: 'My Pack',
    author: 'Bot',
    type: 1
})

// From reply media
await Nailys.sendSticker(from, {
    media: m.quoted,
    packname: 'Pack',
    author: 'Bot'
})

// Premium sticker
await Nailys.sendSticker(from, {
    media: buffer,
    packname: 'Premium',
    author: 'VIP',
    type: 3
})
```

### `Nailys.sendStickerPack(jid, options)`

Send a **sticker pack** (up to 30 stickers per message, auto-batched):

```ts
await Nailys.sendStickerPack(from, {
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

## SWGC

**WhatsApp Status Group Content** — send status-like messages to groups with text formatting, images, videos, voice notes, and audience control.

### Quick Usage

```ts
// Text status
await Nailys.swgc(groupJid, 'Hello everyone!')

// Image status
await Nailys.swgc(groupJid, {
    type: 'image',
    buffer: imageBuffer,
    caption: 'Check this out'
})

// Video status
await Nailys.swgc(groupJid, {
    type: 'video',
    buffer: videoBuffer,
    caption: 'Watch this'
})

// Voice note
await Nailys.swgc(groupJid, {
    type: 'audio',
    buffer: audioBuffer,
    mimetype: 'audio/ogg; codecs=opus',
    ptt: true
})
```

### Builder API — `Nailys.swgcBuilder(jid)`

```ts
await Nailys.swgcBuilder(groupJid)
    .text('Hello World')
    .color('white')         // text color
    .bgcolor('darkred')      // background color
    .font('fancy')           // font style
    .audience('custom', 'Close Friends', '❤️')
    .send()

// Image
await Nailys.swgcBuilder(groupJid)
    .image(buffer)
    .caption('Photo caption')
    .send()

// Video
await Nailys.swgcBuilder(groupJid)
    .video(buffer)
    .caption('Video caption')
    .send()

// Voice Note
await Nailys.swgcBuilder(groupJid)
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
const payload = await Nailys.createStatusPayloadFromInput(m)
await Nailys.swgc(groupJid, payload)

// With custom text
const payload = await Nailys.createStatusPayloadFromInput(m, 'My caption')
await Nailys.swgc(groupJid, payload)
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
| white | `#FFFFFF` |
| black | `#000000` |
| red | `#FF0000` |
| green | `#00FF00` |
| blue | `#0000FF` |
| yellow | `#FFFF00` |
| pink | `#FF69B4` |
| purple | `#800080` |
| orange | `#FFA500` |
| gray | `#808080` |
| cyan | `#00FFFF` |
| teal | `#008080` |
| brown | `#8B4513` |
| gold | `#FFD700` |
| silver | `#C0C0C0` |
| darkred | `#8B0000` |
| darkblue | `#00008B` |
| darkgreen | `#006400` |
| lavender | `#E6E6FA` |

Also supports raw HEX values (without `#`):

```ts
Nailys.resolveColor('#ff0000')  // → 0xFFFF0000
Nailys.resolveFont('fancy')     // → 5
Nailys.COLORS                   // color map object
```

---

## Interactive Messages

Interactive message builders — buttons, bottom sheets, limited-time offers, carousels, and booking forms.


```ts
await Nailys.sendButton(from, {
    title: 'Main Menu',
    body: 'Please choose an option below:',
    footer: '© My Bot',
    contextInfo: { stanzaId: m.key.id, participant: m.key.participant, quotedMessage: m.message },
    buttons: [
        { type: 'reply', display: 'Profile', value: '.profile' },
        { type: 'copy',   display: 'Copy Code', code: 'ABC-123' },
        { type: 'url',    display: 'Website',   url: 'https://example.com' },
        { type: 'call',   display: 'Call CS',   phone: '628123456789' }
    ],
    list: {
        title: 'Menu',
        sections: [{ title: 'Category', rows: [{ title: 'Option A', id: '.opta' }] }]
    }
})
```

### Carousel

```ts
await Nailys.sendCarousel(from, {
    body: 'Main carousel message',
    footer: 'Footer text',
    contextInfo: { stanzaId: m.key.id, participant: m.key.participant, quotedMessage: m.message },
    cards: [
        {
            title: 'Card 1', body: 'Card 1 body',
            media: { image: { url: 'https://placehold.co/600x400/png' } },
            buttons: [{ type: 'reply', display: 'Action', value: '.action1' }]
        },
        {
            title: 'Card 2', body: 'Card 2 body',
            media: { image: { url: 'https://placehold.co/600x400/png' } },
            buttons: [{ type: 'reply', display: 'Visit', value: 'https://example.com' }]
        }
    ]
})
```

### Methods

| Method | Builder | Purpose |
|---|---|---|
| `Nailys.button()` | InteractiveBuilder | Interactive button messages |
| `Nailys.carouselBuilder()` | CarouselBuilder | Multi-card carousel |
| `Nailys.cardBuilder()` | CarouselCardBuilder | Single card for carousel |
| `Nailys.buildButtons(buttons)` | — | Utility: build button array |

---

## ButtonV2

```ts
await Nailys.locbtn()
    .setTitle('📍 My Location')
    .setSubtitle('Jl. Example No. 123')
    .setBody('Here is my location')
    .locreply('📍 Ping', '.ping')
    .send(from, { quoted: m })
```

### `Nailys.sendLocBtn(jid, opts)`

Send a button message with a location header — uses `ButtonV2` internally.

```ts
await Nailys.sendLocBtn(from, {
    body: 'Choose an option:',
    footer: 'Footer text',
    buttons: [
        { display: '👤 Profile', id: '.profile' },
        { display: '⚙️ Settings', id: '.settings' }
    ]
}, { quoted: m })

// With location header
await Nailys.sendLocBtn(from, {
    title: '📍 My Location',
    subtitle: 'Jl. Example No. 123',
    body: 'Here is my location',
    buttons: [
        { display: '📍 Ping', id: '.ping' },
        { display: '📋 Menu', id: '.menu' }
    ]
}, { quoted: m })
```

| Method | Description |
|---|---|
| `setTitle(title)` | Location header title |
| `setSubtitle(subtitle)` | Location header subtitle |
| `setBody(text)` | Body text |
| `setFooter(text)` | Footer text |
| `setThumbnail(url\|buffer)` | Set thumbnail |
| `setLocationThumbnailFromQuoted(quoted)` | Thumbnail from reply |
| `locreply(display, id)` | Quick reply button |
| `loclist(obj)` | List/select button |

---

## UPCH

```ts
await Nailys.upch()
    .image(imageBuffer, 'Amazing photo!')
    .sendch('120363424475734781@newsletter')
```

### `Nailys.sendUpch(jid, payload)`

Send content to a newsletter/channel — uses `UPCH` internally.

```ts
// Send image
await Nailys.sendUpch('120xxx@newsletter', {
    type: 'image', buffer: imageBuffer, caption: 'Amazing photo!'
})

// Send video
await Nailys.sendUpch('120xxx@newsletter', {
    type: 'video', buffer: videoBuffer, caption: 'Watch this!'
})

// Send audio (auto OGG Opus conversion)
await Nailys.sendUpch('120xxx@newsletter', {
    type: 'audio', buffer: audioBuffer, caption: 'Voice message'
})

// Send PTV to chat
await Nailys.sendUpch(chatJid, {
    type: 'video', buffer: videoBuffer, ptv: true
}, { quoted: m })
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
const jid = Nailys.normalizeNewsletterJid('120363424475734781')
// → '120363424475734781@newsletter'

// From invite link
const jid = Nailys.normalizeNewsletterJid('https://whatsapp.com/channel/0029Va...')
```

---

## AI-Rich

```ts
await Nailys.airich()
    .setTitle('Response')
    .addText('Hello! This supports **markdown**.')
    .addCode('javascript', 'console.log("Hello");')
    .send(from, { quoted: m })
```

### `Nailys.sendAIRich(jid, opts)`

Send AI-rich formatted responses with markdown, code blocks, tables, and more.

```ts
await Nailys.sendAIRich(from, {
    title: 'Response',
    text: 'Hello! This supports **markdown**.',
    code: { language: 'javascript', code: 'console.log("Hello");' },
    table: [['Feature', 'Status'], ['Code Block', '✅ Active']],
    tip: 'Make sure your input is valid.',
    suggest: 'Show main menu'
}, { quoted: m })
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
## Payment

Payment & order message builders.

```ts
await Nailys.payment()
    .amount(20000000, 100)
    .currency('IDR')
    .reference('REF-123')
    .send(from, { quoted: m })

await Nailys.order()
    .orderId('INV-1781789438996').orderTitle('Premium Package')
    .sellerJid('6281330586274:85@s.whatsapp.net').token('INV-TOKEN-1781789438996')
    .totalAmountRaw(50000000).currency('IDR').message('Thank you!')
    .itemCount(1).status(1).surface(1)
    .send(from, { quoted: m })
```

### `Nailys.sendPayment()` / `Nailys.sendEWallet()` / `Nailys.sendOrder()`

```ts
await Nailys.sendPayment(from, {
    body: 'Order details',
    footer: 'Thank you',
    amount: 20000000, offset: 100,
    reference: 'REF-123', type: 'digital-goods', status: 'captured',
    description: 'Premium package purchase',
    items: [{ retailer_id: 'PROD-1', name: 'Premium Package', value: 900000, offset: 100, quantity: 1 }],
    tax: 8, discount: 6400, shipping: 4,
    shareStatus: true
}, { quoted: m })

// EWallet
await Nailys.sendEWallet(from, 'dana', {
    key: '087873384161', name: 'DANA',
    fullName: 'John Doe', accountType: 'wallet',
    amount: 50000, reference: 'DANA-123',
    items: [{ name: 'Donation', value: 50000, offset: 100, quantity: 1 }]
}, { quoted: m })

// Order
await Nailys.sendOrder(from, {
    orderId: 'INV-123', orderTitle: 'Package',
    sellerJid: '628xxx:85@s.whatsapp.net', token: 'TOKEN',
    totalAmount: 50000000, currency: 'IDR', message: 'Thanks!',
    itemCount: 1, status: 1, surface: 1
}, { quoted: m })
```

Supported wallets: `dana`, `gopay`, `ovo`, `linkaja`, `seabank`, `qris`, `shopepay`.

---

## Link Preview

**Link preview builder** — Create rich link previews with thumbnails.

> Link preview **cannot** be combined with buttons, interactive, or rich media — this is a WhatsApp protocol limitation.

### `Nailys.sendLinkPreview(jid, opts)`

Send a message with a rich link preview thumbnail.

```ts
await Nailys.sendLinkPreview(from, {
    image: buffer,
    link: 'https://example.com',
    title: 'Example Title',
    description: 'Preview description',
    type: 'small',
    text: 'Check this link!'
}, { quoted: m })

// High quality (big) preview
await Nailys.sendLinkPreview(from, {
    image: buffer, link: 'https://example.com',
    title: 'Example Title', description: 'Preview',
    type: 'big', text: 'Check this link!'
}, { quoted: m })
```

| Property | Description |
|---|---|
| `image` (Buffer\|string) | Thumbnail image |
| `text` (string) | Caption text (auto-appends link) |
| `link` (string) | URL to preview |
| `title` (string) | Preview title |
| `description` (string) | Preview description |
| `type` ('small'\|'big') | `small` = raw buffer. `big` = server upload |

- `type('big')` uploads to WhatsApp server for higher quality.
- `type('small')` uses local raw buffer as `jpegThumbnail`.

---

## LID-to-PN

**LID (Linked Device ID) ↔ Phone Number mapping** — `Nailys.lidToPn()` / `Nailys.pnToLid()`.

Automatically learns mappings from contacts, messages, and group participants. Uses in-memory LID store (`Nailys.signalRepository.lidMapping`) — **no file writes, no database**.

```ts
// Convert LID to phone number JID
const pn = await Nailys.lidToPn('251895939637299@s.whatsapp.net')
// → '6287873384161@s.whatsapp.net'

// Convert phone number to LID
const lid = await Nailys.pnToLid('6287873384161@s.whatsapp.net')
// → '251895939637299@s.whatsapp.net'

// Resolve any JID to PN (with group learning)
const resolved = await Nailys.resolveAnyJidToPn('251895939637299@s.whatsapp.net', groupJid)
```

| Method | Description |
|---|---|
| `Nailys.lidToPn(jid)` | Resolve LID → Phone Number JID |
| `Nailys.pnToLid(jid)` | Resolve Phone Number JID → LID |
| `Nailys.resolveAnyJidToPn(jid, chatJid?)` | Auto-resolve any JID to PN, with group learning |
| `Nailys.toPn(jid)` | Alias for `lidToPn` |
| `Nailys.toLid(jid)` | Alias for `pnToLid` |
| `Nailys.learnLidPn(data)` | Manually teach a mapping |

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
