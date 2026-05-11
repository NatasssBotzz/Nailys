# Natasss Baileys Mod

Mod ini dibuat dari `baileys` 7.0.0-rc10 dan menambahkan helper yang sering dipakai untuk bot WhatsApp/Channel tanpa perlu patch runtime dari project bot.

## Fitur yang ditambahkan

1. **Custom pairing code**
   - `sock.requestPairingCode(number, customCode)` sekarang menerima kode dengan spasi atau strip, lalu dinormalisasi menjadi 8 karakter alfanumerik uppercase.
   - Helper utilitas: `normalizePairingCode()` dan `generateCustomPairingCode()`.

2. **Newsletter / WhatsApp Channel**
   - `sock.sendNewsletterText(newsletterJid, text, options)`
   - `sock.sendNewsletterMedia(newsletterJid, content, options)`
   - `sock.sendNewsletterMessage(newsletterJid, content, options)`
   - `sock.sendNewsletterButtons(newsletterJid, payload, options)`
   - `sock.relayNewsletterMessage(newsletterJid, protoMessage, options)`
   - `sock.newsletterUpdateMetadata(jid, updates)`
   - `sock.newsletterMetadataByJid(jid)`
   - `sock.newsletterMetadataByInvite(inviteCode)`

3. **Metadata forward newsletter**
   - Utilitas `makeForwardedNewsletterContext()` untuk membuat `contextInfo.forwardedNewsletterMessageInfo`.

4. **SWGC / status berbagai media**
   - `sock.sendStatusText(text, statusJidList, options)`
   - `sock.sendStatusMedia(content, statusJidList, options)`
   - Mendukung `backgroundColor` dan `font` untuk teks/status, serta background audio PTT sesuai dukungan Baileys di `prepareWAMessageMedia`.

5. **Button helper**
   - `makeLegacyButtonsMessage()` untuk membuat legacy buttons message.
   - `sock.sendNewsletterButtons()` memakai helper ini untuk relay ke channel.
   - Catatan: dukungan tombol dapat berubah tergantung server WhatsApp dan akun.

6. **Sticker pack media path**
   - `MEDIA_PATH_MAP['sticker-pack'] = '/mms/sticker-pack'`
   - `MEDIA_HKDF_KEY_MAPPING['sticker-pack'] = 'Sticker Pack'`
   - Ini menghilangkan kebutuhan patch runtime untuk mapping upload sticker-pack.

## Contoh penggunaan

```ts
import makeWASocket, {
  makeForwardedNewsletterContext,
  generateCustomPairingCode
} from 'baileys'

const sock = makeWASocket({ /* config biasa */ })

// Custom pairing code
const code = generateCustomPairingCode()
await sock.requestPairingCode('6281234567890', code)

// Kirim teks ke channel/newsletter
await sock.sendNewsletterText('120363xxxx@newsletter', 'Halo dari Natasss Baileys Mod')

// Kirim media ke channel/newsletter
await sock.sendNewsletterMedia('120363xxxx@newsletter', {
  image: Buffer.from([]),
  caption: 'Caption channel'
})

// Kirim tombol ke channel/newsletter
await sock.sendNewsletterButtons('120363xxxx@newsletter', {
  text: 'Pilih menu',
  footer: 'NatasssBotzz',
  buttons: [
    { id: 'menu', text: 'Menu' },
    { id: 'owner', text: 'Owner' }
  ]
})

// Metadata channel sebagai context fake/forward newsletter
const contextInfo = makeForwardedNewsletterContext({
  newsletterJid: '120363xxxx@newsletter',
  newsletterName: 'Natasss Channel',
  serverMessageId: 1
})

await sock.sendMessage('6281234567890@s.whatsapp.net', {
  text: 'Contoh metadata newsletter',
  contextInfo
})

// Status/SWGC teks dengan background custom
await sock.sendStatusText(
  'Status custom background',
  ['6281234567890@s.whatsapp.net'],
  { backgroundColor: '#111827', font: 2 }
)

// Status/SWGC media
await sock.sendStatusMedia(
  { video: Buffer.from([]), caption: 'Status video' },
  ['6281234567890@s.whatsapp.net']
)
```

## Cara pakai di NatasssBotzz

Kalau repo Baileys mod ini sudah kamu upload ke GitHub, ubah dependency bot:

```json
{
  "dependencies": {
    "baileys": "github:USERNAME/NAMA_REPO_BAILEYS_MOD"
  }
}
```

Lalu jalankan:

```bash
npm install
npm start
```

Jika Baileys mod dan bot berada di root VPS yang sama, kamu juga bisa pakai dependency lokal:

```json
{
  "dependencies": {
    "baileys": "file:../WhiskeySockets-Baileys-a263cb0"
  }
}
```

## Catatan penting

- Project ini tetap source TypeScript. Jalankan `npm install` lalu `npm run build` sebelum dipakai sebagai package final.
- Fitur newsletter/channel dan button tergantung dukungan server WhatsApp. Jika WhatsApp mengubah protokol, beberapa helper mungkin perlu disesuaikan lagi.
- Gunakan untuk akun/channel sendiri dan hindari spam agar tidak terkena pembatasan platform.
