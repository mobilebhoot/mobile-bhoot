# 🚀 AWS OTP Services Setup Guide

This guide shows you how to use **AWS services** for OTP authentication in PocketShield instead of (or alongside) MSG91/Gupshup.

## 🌟 AWS OTP Services Overview

| **AWS Service** | **Use Case** | **Cost (Approx)** | **Best For** |
|----------------|--------------|-------------------|--------------|
| **Amazon SNS** | SMS OTP delivery | $0.00645/SMS | Global SMS, pay-per-use |
| **Amazon SES** | Email OTP delivery | $0.0001/email (62K free) | Email verification |
| **Amazon Cognito** | Built-in OTP flow | $0.0055/MAU | Complete auth solution |
| **DynamoDB** | OTP storage | $0.25/month + requests | Scalable, serverless |
| **Lambda** | Custom OTP logic | Pay-per-execution | Serverless functions |

## 📊 Cost Comparison (50K OTPs/month)

| **Provider** | **SMS Cost** | **Storage** | **Total** |
|--------------|--------------|-------------|-----------|
| **MSG91 + Redis** | ₹10,000 | ₹500 | **₹10,500** |
| **AWS SNS + DynamoDB** | ₹2,150 | ₹50 | **₹2,200** |
| **Gupshup WhatsApp** | ₹6,250 | - | **₹6,250** |
| **AWS (SMS + Email)** | ₹2,150 + ₹0 | ₹50 | **₹2,200** |

> 💡 **AWS is 5x cheaper** than Indian SMS providers for high volume!

## ⚙️ 1. AWS Account Setup

### Create AWS Account
```bash
# 1. Sign up at https://aws.amazon.com/
# 2. Verify phone number and payment method
# 3. Choose "Basic Support" (free tier)
```

### Create IAM User for PocketShield
```bash
# Go to AWS Console > IAM > Users > Create User
# Username: pocketshield-api
# Permissions: Attach policies directly
```

### Required IAM Policies
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish",
        "sns:GetTopicAttributes"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:GetAccountSendingEnabled"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:DescribeTable"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/pocketshield-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminGetUser",
        "cognito-idp:InitiateAuth",
        "cognito-idp:RespondToAuthChallenge"
      ],
      "Resource": "*"
    }
  ]
}
```

## 📱 2. Configure Amazon SNS (SMS)

### Enable SMS Sending
```bash
# AWS Console > SNS > Text messaging (SMS) > Sandbox destinations
# Add your phone number for testing: +919876543210
# For production: Request SMS spending limit increase
```

### Set SMS Preferences
```bash
# Go to SNS > Text messaging (SMS) > Preferences
# Default message type: Transactional
# Default sender ID: PocketShield (if supported in your region)
# Spending limit: Set appropriate limit
```

### Request Production Access
```bash
# For high volume SMS (>1000/month):
# AWS Console > Support > Create case
# Case type: Service limit increase
# Limit type: SNS Text Messaging
# Region: ap-south-1 (Mumbai)
# Limit: SMS spending quota
# New limit: $1000/month (adjust as needed)
```

## 📧 3. Configure Amazon SES (Email)

### Verify Sender Email
```bash
# AWS Console > SES > Configuration > Verified identities
# Create identity > Email address
# Email: noreply@yourdomain.com
# Verify via email link
```

### Request Production Access (Optional)
```bash
# By default, SES is in sandbox (can only send to verified emails)
# For production: Request moving out of sandbox
# AWS Console > SES > Account dashboard > Request production access
```

### Configure SMTP (Alternative)
```javascript
// For email via SMTP instead of SES API
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: 'email-smtp.ap-south-1.amazonaws.com',
  port: 587,
  secure: false,
  auth: {
    user: 'YOUR_SMTP_USERNAME',
    pass: 'YOUR_SMTP_PASSWORD'
  }
});
```

## 🗄️ 4. Configure DynamoDB

### Create OTP Table
```bash
# AWS Console > DynamoDB > Tables > Create table
# Table name: pocketshield-otps
# Partition key: phone_number (String)
# Settings: Use default settings
# Enable: Time to Live (TTL) on "expires_at" attribute
```

### Create Table via AWS CLI
```bash
aws dynamodb create-table \
  --table-name pocketshield-otps \
  --attribute-definitions AttributeName=phone_number,AttributeType=S \
  --key-schema AttributeName=phone_number,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region ap-south-1

# Enable TTL for automatic expiration
aws dynamodb update-time-to-live \
  --table-name pocketshield-otps \
  --time-to-live-specification Enabled=true,AttributeName=expires_at \
  --region ap-south-1
```

## 🔐 5. Configure Amazon Cognito (Optional)

### Create User Pool
```bash
# AWS Console > Cognito > User pools > Create user pool
# Sign-in options: Phone number
# Password policy: Customize as needed
# MFA: Optional MFA > SMS
# Message delivery: Use Amazon SNS
```

### Configure Custom Authentication Flow
```javascript
// Lambda trigger for custom authentication
exports.handler = async (event) => {
  if (event.triggerSource === 'DefineAuthChallenge_Authentication') {
    event.response.challengeName = 'SMS_MFA';
    event.response.issueTokens = false;
  }
  
  if (event.triggerSource === 'CreateAuthChallenge_Authentication') {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    event.response.publicChallengeParameters = { phone: event.request.userAttributes.phone_number };
    event.response.privateChallengeParameters = { answer: otp };
    event.response.challengeMetadata = `SMS_${otp}`;
  }
  
  return event;
};
```

## 🔧 6. Environment Configuration

### Update `backend/.env`
```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=AKIA...your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=ap-south-1

# OTP Service Provider (add AWS option)
OTP_PROVIDER=AWS  # or MSG91, GUPSHUP, ALL

# SNS Configuration
SMS_SENDER_NAME=PocketShield
SNS_MAX_PRICE=0.50

# SES Configuration
SES_SENDER_EMAIL=noreply@yourdomain.com
SES_REGION=ap-south-1

# DynamoDB Configuration
DYNAMODB_OTP_TABLE=pocketshield-otps

# Cognito Configuration (optional)
COGNITO_USER_POOL_ID=ap-south-1_xxxxxxxxx
COGNITO_CLIENT_ID=your_client_id

# Hybrid Configuration (use multiple providers)
ENABLE_AWS_SNS=true
ENABLE_AWS_SES=true
ENABLE_MSG91_FALLBACK=true
ENABLE_GUPSHUP_FALLBACK=true
```

## 📦 7. Update Dependencies

### Add AWS SDK
```bash
cd backend
npm install aws-sdk
npm install @aws-sdk/client-sns @aws-sdk/client-ses @aws-sdk/client-dynamodb  # v3 SDK (optional)
```

### Update `package.json`
```json
{
  "dependencies": {
    "aws-sdk": "^2.1498.0",
    "aws-lambda": "^1.0.7",
    "@aws-sdk/client-sns": "^3.441.0",
    "@aws-sdk/client-ses": "^3.441.0",
    "@aws-sdk/client-dynamodb": "^3.441.0",
    "@aws-sdk/client-cognito-identity-provider": "^3.441.0"
  }
}
```

## 🔄 8. Hybrid OTP Service

### Multi-Provider Strategy
```javascript
// backend/src/services/hybridOtpService.js
class HybridOTPService {
  constructor() {
    this.providers = {
      aws: require('./awsOtpService'),
      msg91: require('./productionOtpService'),
      gupshup: require('./productionOtpService')
    };
  }

  async sendOTP(phoneNumber, options = {}) {
    const results = [];
    
    // Primary: AWS SNS (cheapest)
    if (process.env.ENABLE_AWS_SNS === 'true') {
      try {
        const result = await this.providers.aws.sendOTP(phoneNumber, {
          ...options,
          enableSMS: true,
          enableEmail: false
        });
        results.push({ provider: 'AWS SNS', ...result });
      } catch (error) {
        results.push({ provider: 'AWS SNS', success: false, error: error.message });
      }
    }

    // Fallback: MSG91 (if AWS fails)
    if (process.env.ENABLE_MSG91_FALLBACK === 'true' && !results.some(r => r.success)) {
      try {
        const result = await this.providers.msg91.sendOTP(phoneNumber, options);
        results.push({ provider: 'MSG91', ...result });
      } catch (error) {
        results.push({ provider: 'MSG91', success: false, error: error.message });
      }
    }

    // WhatsApp: Gupshup (parallel)
    if (process.env.ENABLE_GUPSHUP === 'true' && options.enableWhatsApp !== false) {
      try {
        const result = await this.providers.gupshup.sendWhatsAppOTP(phoneNumber, otp);
        results.push({ provider: 'Gupshup WhatsApp', ...result });
      } catch (error) {
        results.push({ provider: 'Gupshup WhatsApp', success: false, error: error.message });
      }
    }

    const successfulDeliveries = results.filter(r => r.success);
    return {
      success: successfulDeliveries.length > 0,
      providers: results,
      cost_optimization: this.calculateCostSavings(results)
    };
  }
}
```

## 🧪 9. Testing AWS Services

### Test SNS SMS
```bash
curl -X POST http://localhost:3000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "provider": "AWS",
    "enableSMS": true,
    "enableEmail": false
  }'
```

### Test SES Email
```bash
curl -X POST http://localhost:3000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "email": "user@example.com",
    "provider": "AWS",
    "enableSMS": true,
    "enableEmail": true
  }'
```

### Test DynamoDB Storage
```bash
# Check OTP storage
aws dynamodb scan --table-name pocketshield-otps --region ap-south-1

# Check TTL (Time To Live) working
aws dynamodb describe-time-to-live --table-name pocketshield-otps --region ap-south-1
```

## 📊 10. Monitoring & Costs

### CloudWatch Metrics
```bash
# AWS Console > CloudWatch > Metrics
# Monitor:
# - SNS > SMS > NumberOfMessagesSent
# - SNS > SMS > NumberOfMessagesFailedToSend
# - SES > Email sending quota
# - DynamoDB > ConsumedReadCapacityUnits
```

### Cost Monitoring
```bash
# AWS Console > Billing > Cost Explorer
# Filter by service: SNS, SES, DynamoDB
# Set budget alerts for OTP costs
```

### Real-time Cost Calculator
```javascript
// Calculate monthly costs
const costs = awsOtpService.getCostEstimation(50000); // 50K OTPs
console.log('Monthly AWS costs:', costs.total()); // ~$32 USD (~₹2,200)
```

## 🚀 11. Production Deployment

### Update Docker Compose
```yaml
# docker-compose.yml
services:
  pocketshield-backend:
    environment:
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - OTP_PROVIDER=AWS
      - ENABLE_AWS_SNS=true
      - ENABLE_MSG91_FALLBACK=true
```

### IAM Roles for ECS/Lambda
```bash
# If deploying on ECS or Lambda, use IAM roles instead of access keys
# Create role: pocketshield-ecs-role
# Attach policies: SNS, SES, DynamoDB permissions
```

## 🔄 12. Migration from MSG91 to AWS

### Phase 1: Parallel Testing
```bash
# Enable both providers
OTP_PROVIDER=HYBRID
ENABLE_AWS_SNS=true
ENABLE_MSG91_FALLBACK=true

# 50% traffic to AWS, 50% to MSG91
TRAFFIC_SPLIT_AWS=50
```

### Phase 2: Cost Comparison
```javascript
// Track costs for 1 month
const comparison = {
  aws: { sms: '$32', success_rate: '99.2%' },
  msg91: { sms: '$150', success_rate: '98.8%' }
};
```

### Phase 3: Full Migration
```bash
# Switch to AWS primary
OTP_PROVIDER=AWS
ENABLE_MSG91_FALLBACK=false
```

## ⚠️ 13. Important Considerations

### Regional Limitations
- **SNS SMS**: Limited sender ID support in India
- **Delivery rates**: May vary by operator
- **Regulations**: Comply with DND/TRAI regulations

### Free Tier Limits
- **SNS**: No free tier for SMS
- **SES**: 62,000 emails free/month (first year)
- **DynamoDB**: 25GB storage + 25 WCU/RCU free
- **Lambda**: 1M requests free/month

### Production Checklist
- ✅ SMS spending limit set
- ✅ SES production access requested  
- ✅ DynamoDB TTL enabled
- ✅ CloudWatch monitoring setup
- ✅ Cost budgets configured
- ✅ IAM least privilege access
- ✅ Error handling implemented

---

## 🎯 AWS vs Traditional Providers

| **Factor** | **AWS SNS** | **MSG91** | **Gupshup** |
|------------|-------------|-----------|-------------|
| **Cost** | ₹0.54/SMS | ₹0.15-0.25/SMS | ₹0.25/WhatsApp |
| **Scale** | Unlimited | High | Medium |
| **Reliability** | 99.9% | 99% | 98% |
| **Global** | ✅ | ❌ | ❌ |
| **Setup** | Complex | Simple | Simple |
| **Integration** | Deep AWS | API only | API only |

## 💡 **Recommendation**

**For PocketShield:**
1. **Start with MSG91** (easier setup, India-focused)
2. **Add AWS SNS** for cost optimization at scale
3. **Use hybrid approach** for best reliability + cost
4. **Switch to AWS** when volume > 100K OTPs/month

AWS becomes cost-effective at higher volumes and provides better global reach!
