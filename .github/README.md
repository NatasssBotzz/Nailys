# Naileys

Naileys adalah fork Baileys v7.0.0-rc13 yang sudah membawa tiga modifikasi utama langsung di library:

1. Upload channel WhatsApp atau newsletter lewat teks dan media.
2. Group status atau SWGC tanpa patch runtime dari script bot.
3. Builder NIXCODE untuk button, carousel, AI rich response, limited offer, booking button, dan helper interactive message.

## Instalasi dari GitHub

Pakai repo ini sebagai dependency bot baru.

```json
{
  "dependencies": {
    "baileys": "github:NatasssBotzz/Naileys"
  }
}
```


## Import dasar

```js
import makeWASocket, { MessageBuilder } from 'baileys'
```

## Channel WhatsApp

Target channel bisa berupa JID newsletter, ID angka, atau link channel.

```js
await MessageBuilder.upch(sock, '120xxxxxxxxxx@newsletter', 'test')
```

```js
await MessageBuilder.upch(sock, 'https://whatsapp.com/channel/XXXXXXXX', 'test')
```

Kirim media ke channel.

```js
await MessageBuilder.upch(sock, '120xxxxxxxxxx@newsletter', {
  image: buffer,
  caption: 'test'
})
```

```js
await MessageBuilder.upch(sock, '120xxxxxxxxxx@newsletter', {
  video: buffer,
  caption: 'test',
  mimetype: 'video/mp4'
})
```

```js
await MessageBuilder.upch(sock, '120xxxxxxxxxx@newsletter', {
  audio: buffer,
  mimetype: 'audio/ogg; codecs=opus',
  ptt: false
})
```

Kirim dari pesan yang direply.

```js
await MessageBuilder.upch(sock, '120xxxxxxxxxx@newsletter', m, {
  caption: 'test'
})
```

## SWGC atau status grup

`groupStatusMessageV2` sudah didukung langsung di core message normalizer. Tidak perlu patch file Baileys dari luar.

Kirim teks status grup.

```js
await MessageBuilder.sendSwgc(sock, '120xxxxxxxxxx@g.us', 'test')
```

Kirim gambar status grup.

```js
await MessageBuilder.sendSwgc(sock, '120xxxxxxxxxx@g.us', {
  type: 'image',
  buffer,
  caption: 'test'
})
```

Kirim video status grup.

```js
await MessageBuilder.sendSwgc(sock, '120xxxxxxxxxx@g.us', {
  type: 'video',
  buffer,
  caption: 'test',
  mimetype: 'video/mp4'
})
```

Kirim audio status grup.

```js
await MessageBuilder.sendSwgc(sock, '120xxxxxxxxxx@g.us', {
  type: 'audio',
  buffer,
  mimetype: 'audio/ogg; codecs=opus',
  ptt: false
})
```

Builder SWGC.

```js
await new MessageBuilder.Swgc(sock)
  .target('120xxxxxxxxxx@g.us')
  .text('test')
  .send()
```

## NIXCODE Button

```js
await new MessageBuilder.Button(sock)
  .setTitle('test')
  .setBody('test')
  .setFooter('test')
  .addButton('quick_reply', {
    display_text: 'test',
    id: 'test'
  })
  .send(m.chat, { quoted: m })
```

URL button.

```js
await new MessageBuilder.Button(sock)
  .setBody('')
  .addButton('cta_url', {
    display_text: 'test',
    url: 'https://example.com',
    merchant_url: 'https://example.com'
  })
  .send(m.chat)
```

Copy button.

```js
await new MessageBuilder.Button(sock)
  .setBody('')
  .addButton('cta_copy', {
    display_text: 'test',
    copy_code: 'test'
  })
  .send(m.chat)
```

Booking button.

```js
await new MessageBuilder.Button(sock)
  .setBody('')
  .addButton('booking_confirmation', {
    start_datetime: new Date(Date.now() + 60000).toISOString(),
    end_datetime: new Date(Date.now() + 660000).toISOString(),
    location: 'test',
    booking_url: 'https://example.com',
    phone_number: '6281234567890',
    booking_management_url: 'https://example.com',
    description: 'test',
    email: 'test@gmail.com',
    display_text: 'test',
    display_content: {
      display_language: 'id',
      display_meeting_type: 'test',
      display_bottom_sheet_header: 'test',
      display_add_to_calendar_cta_text: 'test',
      display_view_on_maps_cta_text: 'test',
      display_manage_booking_cta_text: 'test',
      display_manage_booking_not_supported_text: 'test',
      display_read_more: 'test'
    }
  })
  .send(m.chat)
```

Selection button.

```js
await new MessageBuilder.Button(sock)
  .setBody('')
  .addButton('single_select', {
    title: 'test',
    sections: [
      {
        title: 'test',
        rows: [
          {
            title: 'test',
            description: 'test',
            id: 'test'
          }
        ]
      }
    ],
    icon: 'DEFAULT'
  })
  .send(m.chat)
```

Limited offer.

```js
await new MessageBuilder.Button(sock)
  .setImage(buffer, { mimetype: 'image/jpeg' })
  .setLimitedOffer({
    text: 'test',
    url: 'https://example.com',
    copy_code: 'test',
    noExpiration: true
  })
  .addButton('cta_url', {
    display_text: 'test',
    url: 'https://example.com'
  })
  .send(m.chat)
```

## Carousel

```js
const card1 = await new MessageBuilder.Button(sock)
  .setImage(buffer, { mimetype: 'image/jpeg' })
  .setBody('test')
  .addButton('quick_reply', {
    display_text: 'test',
    id: 'test'
  })
  .toCard()

const card2 = await new MessageBuilder.Button(sock)
  .setImage(buffer, { mimetype: 'image/jpeg' })
  .setBody('test')
  .addButton('cta_url', {
    display_text: 'test',
    url: 'https://example.com'
  })
  .toCard()

await new MessageBuilder.Carousel(sock)
  .setBody('test')
  .setFooter('test')
  .addCard([card1, card2])
  .send(m.chat)
```

Carousel dengan limited offer.

```js
await MessageBuilder.sendCarouselWithLimitOffer(sock, m.chat, {
  body: '',
  footer: '',
  cards: [
    {
      image: buffer,
      body: '',
      limitOffer: {
        text: '',
        url: 'https://example.com',
        copy_code: 'test',
        noExpiration: true
      },
      buttons: [
        {
          name: 'cta_url',
          params: {
            display_text: 'test',
            url: 'https://example.com'
          }
        }
      ]
    }
  ]
})
```

## ButtonV2

```js
await new MessageBuilder.ButtonV2(sock)
  .setBody('test')
  .setFooter('test')
  .setThumbnail(buffer)
  .addButton('test', 'test')
  .send(m.chat)
```

## AI Rich

```js
await new MessageBuilder.AIRich(sock)
  .setTitle('test')
  .addText('test')
  .addCode('javascript', 'console.log("test")')
  .addTable([
    ['test', 'test'],
    ['test', 'test']
  ])
  .send(m.chat)
```

## Build lokal

```bash
npm install
npm run build
```

Setelah build, package menghasilkan folder `lib` dan bisa dipakai sebagai dependency GitHub.
