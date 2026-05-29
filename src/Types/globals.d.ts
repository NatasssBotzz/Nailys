declare global {
	interface RequestInit {
		dispatcher?: any
		duplex?: 'half' | 'full'
	}
}

declare module 'node-webpmux'
declare module 'archiver'
declare module 'qrcode-terminal'

export {}
