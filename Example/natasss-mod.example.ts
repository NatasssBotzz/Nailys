import makeWASocket, {
	generateCustomPairingCode,
	makeForwardedNewsletterContext,
	useMultiFileAuthState
} from '../src/index'

async function demo() {
	const { state, saveCreds } = await useMultiFileAuthState('auth')
	const sock = makeWASocket({ auth: state } as any)
	sock.ev.on('creds.update', saveCreds)

	if (!state.creds.registered) {
		await sock.requestPairingCode('6281234567890', generateCustomPairingCode())
	}

	await sock.sendNewsletterText('120363000000000000@newsletter', 'Halo channel')

	await sock.sendNewsletterButtons('120363000000000000@newsletter', {
		text: 'Pilih menu',
		footer: 'NatasssBotzz',
		buttons: [
			{ id: 'menu', text: 'Menu' },
			{ id: 'owner', text: 'Owner' }
		]
	})

	const contextInfo = makeForwardedNewsletterContext({
		newsletterJid: '120363000000000000@newsletter',
		newsletterName: 'Natasss Channel',
		serverMessageId: 1
	})

	await sock.sendMessage('6281234567890@s.whatsapp.net', {
		text: 'Fake/forwarded newsletter metadata',
		contextInfo
	})

	await sock.sendStatusText('Status custom background', ['6281234567890@s.whatsapp.net'], {
		backgroundColor: '#111827',
		font: 2
	})
}

demo().catch(console.error)
