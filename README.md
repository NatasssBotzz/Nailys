# Naileys

Naileys adalah fork Baileys v7.0.0-rc13 yang sudah ditambah fitur tester dari script bot ke dalam library, jadi bot cukup import `naileys` tanpa patch helper luar.

Fitur tambahan utama:

- patch ESM untuk import `libsignal/src/...` agar jalan di Node ESM.
- custom pairing code.
- support sticker pack.
- SWGC / group status.
- channel upload helper.
- builder NIXCODE 4.4: button, header document, carousel, limited offer, booking button, old button, dan AI rich response.

## Instalasi

```json
{
  "dependencies": {
    "naileys": "github:NatasssBotzz/Naileys"
  }
}
```

Import dasar:

```js
import makeWASocket, { useMultiFileAuthState } from 'naileys'

const { state, saveCreds } = await useMultiFileAuthState('./session')

const Naileys = makeWASocket({
  auth: state,
  printQRInTerminal: false
})

Naileys.ev.on('creds.update', saveCreds)
```

## Patch ESM libsignal

Patch sudah otomatis jalan lewat `postinstall`.

```bash
npm install
```

Bisa juga dijalankan manual:

```bash
npm run patch:esm
```

Patch ini mengubah import seperti:

```js
libsignal/src/curve
libsignal/src/crypto
libsignal/src/protobufs
```

menjadi:

```js
libsignal/src/curve.js
libsignal/src/crypto.js
libsignal/src/protobufs.js
```

## Custom pairing

Pairing punya 2 tipe:

- `0` = pairing code.
- `1` = QR.

Custom code maksimal 8 huruf/angka.

```js
await Naileys.pairing(0, {
  phoneNumber: '6283892764673',
  CustomCode: 'NATASSBZ'
})
```

Alias parameter juga didukung:

```js
await Naileys.pairing(0, {
  PairingNumber: '6283892764673',
  customCode: 'NATASSBZ'
})
```

QR mode:

```js
await Naileys.pairing(1, {
  printQR: true
})
```

## Channel / newsletter

Target channel bisa pakai JID newsletter, ID angka, atau link channel.

```js
await Naileys.upch('120xxxxxxxxxx@newsletter', 'teks channel')
```

```js
await Naileys.upch('https://whatsapp.com/channel/XXXXXXXX', {
  image: buffer,
  caption: 'caption channel'
})
```

Kirim media dari pesan reply:

```js
await Naileys.upch('120xxxxxxxxxx@newsletter', m, {
  caption: 'caption baru'
})
```

## SWGC / group status

```js
await Naileys.sendSwgc('120xxxxxxxxxx@g.us', 'teks status grup')
```

```js
await Naileys.sendSwgc('120xxxxxxxxxx@g.us', {
  type: 'image',
  buffer,
  caption: 'status grup image'
})
```

Builder SWGC:

```js
await Naileys.Swgc()
  .target('120xxxxxxxxxx@g.us')
  .text('status grup')
  .send()
```

## Naileys.Message / NIXCODE button

Quick reply:

```js
await Naileys.Message()
  .setTitle('Tester Native Flow')
  .setBody('Body message')
  .setFooter('Footer')
  .addReply('Menu', '.menu')
  .send(m.chat, { quoted: m })
```

URL button:

```js
await Naileys.Message()
  .setBody('Buka link di bawah')
  .addUrl('GitHub', 'https://github.com/NatasssBotzz/Naileys')
  .send(m.chat, { quoted: m })
```

Copy button:

```js
await Naileys.Message()
  .setBody('Copy kode')
  .addCopy('Copy', 'NIX-CODE-2026')
  .send(m.chat, { quoted: m })
```

Call, reminder, cancel reminder, address, dan location:

```js
await Naileys.Message()
  .setBody('Tester button')
  .addCall('Call', '6281234567890')
  .addReminder('Reminder', 'reminder_id')
  .addCancelReminder('Cancel Reminder', 'cancel_id')
  .addAddress('Address', 'address_id')
  .addLocation({ latitude: 0, longitude: 0, name: 'Lokasi' })
  .send(m.chat, { quoted: m })
```

Selection:

```js
await Naileys.Message()
  .setBody('Pilih menu')
  .setParams({
    bottom_sheet: {
      in_thread_buttons_limit: 3,
      list_title: 'Menu Tester',
      button_title: 'Pilih'
    }
  })
  .addSelection('Pilih Command')
  .makeSections('Menu', 'Utama')
  .makeRow('Utama', 'Menu', 'Buka menu utama', '.menu')
  .makeSections('Tester', 'Visual')
  .makeRow('Native', 'Button V2', 'Tester old button', '.testbuttonv2')
  .send(m.chat, { quoted: m })
```

Booking confirmation:

```js
await Naileys.Message()
  .setBody('Booking confirmation')
  .addBookingConfirmation({
    start_datetime: new Date(Date.now() + 60_000).toISOString(),
    end_datetime: new Date(Date.now() + 660_000).toISOString(),
    location: 'Indonesia',
    booking_url: 'https://example.com',
    phone_number: '6281234567890',
    booking_management_url: 'https://example.com/manage',
    description: 'Tester booking',
    email: 'test@example.com',
    display_text: 'Booking',
    display_content: {
      display_language: 'id',
      display_meeting_type: 'Meeting',
      display_bottom_sheet_header: 'Detail Booking',
      display_add_to_calendar_cta_text: 'Kalender',
      display_view_on_maps_cta_text: 'Maps',
      display_manage_booking_cta_text: 'Manage',
      display_manage_booking_not_supported_text: 'Tidak support',
      display_read_more: 'Baca lagi'
    }
  })
  .send(m.chat, { quoted: m })
```

## Header document

Header dimasukkan ke builder `Naileys.Message()` dengan format:

```js
.addheader(jenisHeader, options)
```

Alias kapital juga tersedia:

```js
.addHeader(jenisHeader, options)
```

Header tanpa thumbnail:

```js
await Naileys.Message()
  .setBody('Header PNG tanpa thumbnail')
  .setFooter('Naileys')
  .addheader('png', {
    title: 'NIXCODE PNG',
    fileName: 'nixcode.png',
    content: 'test png'
  })
  .send(m.chat, { quoted: m })
```

Header dengan thumbnail PNG:

```js
await Naileys.Message()
  .setBody('Header PNG dengan thumbnail')
  .addheader('png', {
    title: 'NIXCODE PNG',
    fileName: 'nixcode.png',
    content: 'test png',
    thumbnail: pngThumbnailBuffer
  })
  .send(m.chat, { quoted: m })
```

Header dengan thumbnail JPG:

```js
await Naileys.Message()
  .setBody('Header JPG dengan thumbnail')
  .addheader('jpg', {
    title: 'NIXCODE JPG',
    fileName: 'nixcode.jpg',
    content: 'test jpg',
    thumbnail: jpgThumbnailBuffer
  })
  .send(m.chat, { quoted: m })
```

Header dengan thumbnail PDF:

```js
await Naileys.Message()
  .setBody('Header PDF dengan thumbnail')
  .addheader('pdf', {
    title: 'NIXCODE PDF',
    fileName: 'nixcode.pdf',
    content: 'test pdf',
    thumbnail: pdfThumbnailBuffer
  })
  .send(m.chat, { quoted: m })
```

Jenis header lain yang bisa dipakai: `docx`, `xlsx`, `pptx`, `zip`, `apk`, `txt`, `json`.

```js
await Naileys.Message()
  .setBody('Header ZIP')
  .addheader('zip', {
    title: 'NIXCODE ZIP',
    fileName: 'nixcode.zip',
    content: 'test zip'
  })
  .send(m.chat)
```

## Limited offer

Offer tipe URL:

```js
await Naileys.Message()
  .setBody('Limited offer URL')
  .addheader('png', {
    title: 'NIXCODE Offer',
    fileName: 'offer.png',
    thumbnail: pngThumbnailBuffer
  })
  .setLimitedOffer({
    text: 'Diskon aktif',
    url: 'https://example.com',
    noExpiration: true
  })
  .addUrl('Buka Offer', 'https://example.com')
  .send(m.chat, { quoted: m })
```

Offer tipe copy code:

```js
await Naileys.Message()
  .setBody('Limited offer copy')
  .setLimitedOffer({
    text: 'Copy kode promo',
    url: 'https://example.com',
    copy_code: 'NIX-CODE-2026',
    noExpiration: true
  })
  .addCopy('Copy Kode', 'NIX-CODE-2026')
  .send(m.chat, { quoted: m })
```

## Carousel

```js
const card1 = await Naileys.Message()
  .setImage(buffer, { mimetype: 'image/jpeg' })
  .setBody('Card 1')
  .addReply('Pilih 1', 'card_1')
  .toCard()

const card2 = await Naileys.Message()
  .setImage(buffer, { mimetype: 'image/jpeg' })
  .setBody('Card 2')
  .addUrl('Buka', 'https://example.com')
  .toCard()

await Naileys.Carousel()
  .setBody('Tester Carousel')
  .setFooter('Naileys')
  .addCard([card1, card2])
  .send(m.chat, { quoted: m })
```

Carousel limited offer:

```js
await Naileys.sendCarouselWithLimitOffer(m.chat, {
  body: 'Carousel Offer',
  footer: 'Naileys',
  cards: [
    {
      image: buffer,
      body: 'Offer card',
      limitOffer: {
        text: 'Promo',
        url: 'https://example.com',
        copy_code: 'NIX-CODE-2026',
        noExpiration: true
      },
      buttons: [
        {
          name: 'cta_url',
          params: {
            display_text: 'Buka',
            url: 'https://example.com'
          }
        }
      ]
    }
  ]
}, { quoted: m })
```

## Old button / ButtonV2

Button lama versi 1, sama seperti `testbuttonv2`: raw old button tanpa `single_select`.

```js
await Naileys.ButtonV2()
  .setBody('Halo dunia')
  .setFooter('Footer Message')
  .setThumbnail(buffer)
  .setLocationMessage({
    degreesLatitude: 0,
    degreesLongitude: 0,
    name: 'tes',
    address: 'tes',
    url: 'https://example.com',
    isLive: true,
    comment: 'tes'
  })
  .addRawButton({
    buttonText: { displayText: '📡 Menu 1' },
    buttonId: 'NixelMenu1',
    type: 1
  })
  .addRawButton({
    buttonText: { displayText: '📡 Menu 2' },
    buttonId: 'NixelMenu2',
    type: 1
  })
  .send(m.chat, { quoted: m })
```

Button lama versi 2, sama seperti `testbutton3`: raw old button dengan `nativeFlowInfo.single_select`.

```js
await Naileys.ButtonV2()
  .setBody('Halo dunia')
  .setFooter('Footer Message')
  .setThumbnail(buffer)
  .setLocationMessage({
    degreesLatitude: 0,
    degreesLongitude: 0,
    name: 'tes',
    address: 'tes',
    url: 'https://example.com',
    isLive: true,
    comment: 'tes'
  })
  .addRawButton({
    buttonText: { displayText: '📡 Menu 1' },
    buttonId: 'NixelMenu1',
    type: 1,
    nativeFlowInfo: {
      name: 'single_select',
      paramsJson: JSON.stringify({
        title: 'Click Here 1!',
        sections: [
          {
            title: 'Fiora Sylvie 1',
            rows: [
              {
                header: '',
                title: 'Nixel',
                description: 'Buka menu utama',
                id: '.menu'
              }
            ]
          }
        ]
      })
    }
  })
  .send(m.chat, { quoted: m })
```

## AI Rich

AI Rich dipindah sesuai plugin: text, code, table, source, image, reels, latex, citation, setTitle, extended, dan all.

Text + hyperlink:

```js
await Naileys.AIRich()
  .addText('Halo dari [Naileys](https://github.com/NatasssBotzz/Naileys).')
  .addText('Command utama: .menu\nCommand tester: .tester')
  .send(m.chat, { forwarded: true, includesUnifiedResponse: true })
```

Code:

```js
await Naileys.AIRich()
  .addCode('javascript', `const command = '.menu'
switch (command) {
  case '.menu':
    console.log('menu')
    break
}`)
  .send(m.chat, { forwarded: true, includesUnifiedResponse: true })
```

Table:

```js
await Naileys.AIRich()
  .addTable([
    ['Fitur', 'Command', 'Status'],
    ['Button V2', '.testbuttonv2', 'Aktif'],
    ['Button 3', '.testbutton3', 'Native'],
    ['Carousel', '.testcarousel', 'Aktif'],
    ['AI Rich', '.airich', 'Dipisah']
  ])
  .send(m.chat, { forwarded: true, includesUnifiedResponse: true })
```

Source:

```js
await Naileys.AIRich()
  .addText('Tester AIRich source.')
  .addSource([
    ['https://picsum.photos/64/64', 'https://github.com/NatasssBotzz/Naileys', 'Naileys'],
    ['https://picsum.photos/65/65', 'https://openai.com', 'OpenAI']
  ])
  .send(m.chat, { forwarded: true, includesUnifiedResponse: true })
```

Image:

```js
await Naileys.AIRich()
  .addImage([
    'https://picsum.photos/600/400',
    'https://picsum.photos/700/400'
  ])
  .send(m.chat, { forwarded: true, includesUnifiedResponse: true })
```

Reels:

```js
await Naileys.AIRich()
  .addReels([
    {
      title: 'NIXCODE',
      profileIconUrl: 'https://picsum.photos/64/64',
      thumbnailUrl: 'https://picsum.photos/600/400',
      videoUrl: 'https://example.com/video.mp4',
      reels_title: 'Tester Reels',
      likes_count: 12000,
      shares_count: 500,
      view_count: 999999,
      reel_source: 'IG',
      is_verified: true
    }
  ])
  .send(m.chat, { forwarded: true, includesUnifiedResponse: true })
```

Latex:

```js
const text = [
  'Shiroko is my bini:',
  '- Model 1: {{NIXEL_0}}$L = p \\times l${{/NIXEL_0}}',
  '- Model 2: {{IE_1}}$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}${{/IE_1}}'
].join('\n')

await Naileys.AIRich()
  .addLatex(text, [
    {
      key: 'NIXEL_0',
      expression: '$L = p \\times l$',
      imageUrl: 'https://cdn.ornzora.eu.cc/1ca0f9a4-a81f-498e-92e8-8a4c76abf1ef-FIORA.png',
      width: 1279,
      height: 825,
      fontHeight: 83.333333333333,
      padding: 15
    },
    {
      key: 'IE_1',
      expression: '$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$',
      imageUrl: 'https://cdn.ornzora.eu.cc/a3a756f2-6bb8-4814-a024-c325524a2308-FIORA.png',
      width: 1429,
      height: 1897,
      fontHeight: 83.333333333333,
      padding: 15
    }
  ])
  .send(m.chat, { forwarded: true, includesUnifiedResponse: true })
```

Citation:

```js
await Naileys.AIRich()
  .addText(`# AIRich Citation

Auto citation:
[](https://openai.com)
[](https://github.com/NatasssBotzz/Naileys)`)
  .send(m.chat)
```

Set title:

```js
await Naileys.AIRich()
  .setTitle('NIXCODE 4.4')
  .addText('Tester khusus setTitle.')
  .send(m.chat)
```

Extended:

```js
await Naileys.AIRich()
  .setTitle('NIXCODE 4.4 • Extended AIRich')
  .addText(`# Extended AIRich

Hyperlink: [Nixel](https://fiora.nixel.my.id/)
Citation: [](https://openai.com)
Latex: [Shiroko|1429|1897|83.33|15]<https://cdn.ornzora.eu.cc/a3a756f2-6bb8-4814-a024-c325524a2308-FIORA.png>`)
  .addCode('javascript', `class NixcodeTester {
  static version() {
    return '4.4'
  }
}`)
  .addTable([
    ['Fitur', 'Status'],
    ['setTitle', 'OK'],
    ['citation', 'OK'],
    ['latex', 'OK'],
    ['reels', 'OK']
  ])
  .addSource([
    ['https://picsum.photos/64/64', 'https://github.com/NatasssBotzz/Naileys', 'Naileys']
  ])
  .addImage(['https://picsum.photos/600/400'])
  .addReels([
    {
      title: 'NIXCODE',
      profileIconUrl: 'https://picsum.photos/64/64',
      thumbnailUrl: 'https://picsum.photos/600/400',
      videoUrl: 'https://fiora.nixel.my.id/',
      reels_title: 'Extended Demo',
      likes_count: 12000,
      shares_count: 500,
      view_count: 999999,
      reel_source: 'IG',
      is_verified: true
    }
  ])
  .send(m.chat)
```

## Sticker pack

Sticker pack mengikuti plugin `sptes`.

```js
await Naileys.StickerPack()
  .setPackName('tes')
  .setAuthor('tes')
  .addSticker({
    url: 'https://files.catbox.moe/h57uaj.jpg',
    isAnimated: true
  })
  .addSticker({
    url: 'https://files.catbox.moe/ckafjz.gif',
    isAnimated: true
  })
  .send(m.chat, { quoted: m })
```

Helper langsung:

```js
await Naileys.sendStickerPack(m.chat, {
  packname: 'tes',
  author: 'tes',
  stickers: [
    { url: 'https://files.catbox.moe/h57uaj.jpg', isAnimated: true },
    { url: 'https://files.catbox.moe/ckafjz.gif', isAnimated: true }
  ]
}, { quoted: m })
```

Helper sticker biasa:

```js
await Naileys.sticker()
  .setPackName('tes')
  .setAuthor('tes')
  .sendImage(m.chat, buffer, { quoted: m })
```

## Build lokal

```bash
npm install
npm run build
```

Setelah build, folder `lib` bisa dipakai sebagai dependency GitHub.
