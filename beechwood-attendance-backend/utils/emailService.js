// utils/emailService.js - Email Service

const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);



// Send Welcome Email with Credentials
const sendWelcomeEmail = async (user, password) => {
    const mailOptions = {
        from: `"Beechwood Solutions" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Welcome to Beechwood Attendance System - Your Login Credentials',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h2 style="color: white;">Welcome to Beechwood Solutions</h2>
                    <p style="color: white;">Attendance Management System</p>
                </div>
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h3>Dear ${user.firstName} ${user.lastName},</h3>
                    <p>Your account has been created successfully. Here are your login credentials:</p>
                    
                    <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                        <p><strong>📧 Email:</strong> ${user.email}</p>
                        <p><strong>🔑 Password:</strong> ${password}</p>
                        <p><strong>🆔 Employee ID:</strong> ${user.employeeId}</p>
                        <p><strong>👤 Role:</strong> ${user.role.toUpperCase()}</p>
                    </div>
                    
                    <p>You can login using the following link:</p>
                    <p><a href="${process.env.FRONTEND_URL}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Dashboard</a></p>
                    
                    <p><strong>⚠️ Security Note:</strong> Please change your password after your first login.</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
                    <p style="color: #666; font-size: 12px;">© ${new Date().getFullYear()} Beechwood Solutions India. All rights reserved.</p>
                </div>
            </div>
        `
    };
    
    try {

            const info = await resend.emails.send({
            from: "Beechwood <onboarding@resend.dev>",
            to: user.email,
            subject: mailOptions.subject,
            html: mailOptions.html,
        });

        console.log("✅ Welcome email sent:", info);
    } catch (error) {

        console.error("❌ Welcome email failed:", error);

    }
    };

// Send Password Reset Email
const sendPasswordResetEmail = async (user, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;
    
    const mailOptions = {
        from: `"Beechwood Solutions" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Password Reset Request - Beechwood Attendance System',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h2 style="color: white;">Password Reset Request</h2>
                </div>
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p>Hello ${user.firstName} ${user.lastName},</p>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    
                    <p style="text-align: center;">
                        <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                    </p>
                    
                    <p>If you didn't request this, please ignore this email.</p>
                    <p>This link will expire in 1 hour.</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">© ${new Date().getFullYear()} Beechwood Solutions India. All rights reserved.</p>
                </div>
            </div>
        `
    };
    
    try {

        const info = await resend.emails.send({
        from: "Beechwood <onboarding@resend.dev>",
        to: user.email,
        subject: mailOptions.subject,
        html: mailOptions.html,
    });

    console.log("✅ Reset email sent:", info);

    } catch (error) {

        console.error("❌ Reset email failed:", error);

    }
};

// Send Email Verification
const sendVerificationEmail = async (user, token) => {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const mailOptions = {
        from: `"Beechwood Solutions" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Verify Your Email - Beechwood Attendance System',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h2 style="color: white;">Verify Your Email</h2>
                </div>
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p>Hello ${user.firstName} ${user.lastName},</p>
                    <p>Please verify your email address to complete your registration:</p>
                    
                    <p style="text-align: center;">
                        <a href="${verifyUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
                    </p>
                    
                    <p>This link will expire in 24 hours.</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">© ${new Date().getFullYear()} Beechwood Solutions India. All rights reserved.</p>
                </div>
            </div>
        `
    };
    
    try {

        const info = await resend.emails.send({
        from: "Beechwood <onboarding@resend.dev>",
        to: user.email,
        subject: mailOptions.subject,
        html: mailOptions.html,
    });

    console.log("✅ Verification email sent:", info);

    } catch (error) {

        console.error("❌ Verification email failed:", error);

    }
};

module.exports = {
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendVerificationEmail
};