const nodemailer = require('nodemailer');

async function main() {
	const host = process.env.SMTP_HOST || 'ssl0.ovh.net';
	const port = parseInt(process.env.SMTP_PORT || '465', 10);
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;
	const to = process.env.TO_EMAIL;
	const subject = process.env.SUBJECT || 'Test message';
	const text = process.env.TEXT || 'This is a test email.';

	if (!user || !pass) {
		console.error('Missing SMTP_USER or SMTP_PASS');
		process.exit(1);
	}
	if (!to) {
		console.error('Missing TO_EMAIL');
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
		const info = await transporter.sendMail({
			from: user,
			to,
			subject,
			text,
			html: `<p>${text}</p>`
		});
		console.log('Email sent:', info.messageId || info);
	} catch (error) {
		console.error('Send error:', error && error.message ? error.message : error);
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

