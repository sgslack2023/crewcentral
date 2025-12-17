# Email Templates for EmployPro
# This file contains all email templates used throughout the application

EMAIL_TEMPLATES = {
    'WELCOME_ADMIN_CREATED': {
        'subject': 'Welcome to BVL',
        'body': '''Hello {fullname},

Welcome to BVL! We are excited to have you on board.

Please set up your password by visiting the following link:
{setup_link}

Once you set up your password, you can log in and start using the system.

Best regards,
BVL Team'''
    },
    'ACCOUNT_APPROVED': {
        'subject': 'Welcome to BVL - Account Approved',
        'body': '''Hello {fullname},

Great news! Your account has been approved and you now have access to the EmployPro system.

Please set up your password by visiting the following link:
{setup_link}

Once you set up your password, you can log in and start using the system.

Welcome aboard!

Best regards,
BVL Team'''
    },
    'PASSWORD_RESET': {
        'subject': 'BVL - Password Reset',
        'body': '''Hello {fullname},

You requested a password reset for your BVL account.

Click the following link to reset your password:
{reset_link}

If the link doesn't work, you can manually enter this token on the reset password page: {token}

This token will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email.

Best regards,
BVL Team'''
    },
    'ACCOUNT_REQUEST_RECEIVED': {
        'subject': 'BVL - Account Request Received',
        'body': '''Hello {fullname},

Thank you for your interest in BVL!

We have received your account request and it is currently under review by our administrators.

You will receive another email once your account has been reviewed and approved. This process typically takes 1-2 business days.

If you have any questions, please contact our support team at {support_email}.

Best regards,
BVL Team'''
    },
    'ACCOUNT_DENIED': {
        'subject': 'BVL - Account Request Update',
        'body': '''Hello {fullname},

Thank you for your interest in BVL.

Unfortunately, we are unable to approve your account request at this time.

Reason: {denial_reason}

If you have any questions or believe this is an error, please contact our support team at {support_email}.

You may submit a new account request in the future if your circumstances change.

Best regards,
BVL Team'''
    }
}

# Email Configuration URLs
#EMAIL_URLS = {
#    'SETUP_PASSWORD_URL': 'http://localhost:3000/check-user',
#    'RESET_PASSWORD_URL': 'http://localhost:3000/resetpassword',
#    'LOGIN_URL': 'http://localhost:3000/login',
#    'SUPPORT_EMAIL': 'support@employeepro.com'
#}



# Email Configuration URLs
EMAIL_URLS = {
    'SETUP_PASSWORD_URL': 'http://3.17.95.130/check-user',
    'RESET_PASSWORD_URL': 'http://3.17.95.130/resetpassword',
    'LOGIN_URL': 'http://3.17.95.130/login',
    'SUPPORT_EMAIL': 'info@balticvanlines.ca'
}