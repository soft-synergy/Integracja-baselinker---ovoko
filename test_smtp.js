const nodemailer = require('nodemailer');

async function main() {
	const host = process.env.SMTP_HOST || 'ssl0.ovh.net';
	const port = parseInt(process.env.SMTP_PORT || '465', 10);
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;

	if (!user || !pass) {
		console.error('Missing SMTP_USER or SMTP_PASS');
		process.exit(1);
	}

	const transporter = nodemailer.createTransport({
		host,
		port,
		secure: port === 465,
		auth: { user, pass },
		tls: {
			servername: host
		}
	});

	try {
		const verified = await transporter.verify();
		console.log('SMTP verify result:', verified);
	} catch (error) {
		console.error('SMTP verify error:', error && error.message ? error.message : error);
		process.exitCode = 2;
	} finally {
		if (typeof transporter.close === 'function') {
			transporter.close();
		}
	}
}

main().catch((error) => {
	console.error('Unexpected error:', error && error.message ? error.message : error);
	process.exit(3);
});

