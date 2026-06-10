import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'cipherchat09@gmail.com',
    pass: 'bxynuvwisrdbhcwe'
  }
});

transporter.verify(function(error, success) {
  if (error) {
    console.log('SMTP Connection Failed:', error);
    process.exit(1);
  } else {
    console.log('✅ SMTP Connection Successful!');
    process.exit(0);
  }
});
