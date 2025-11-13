#!/bin/bash

# 🚀 PocketShield OTP Provider Setup Script
# Choose between AWS, MSG91, Gupshup, or Hybrid configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║           🛡️  PocketShield OTP Provider Setup            ║"
    echo "║                                                          ║"
    echo "║  Choose your OTP delivery method:                        ║"
    echo "║  • AWS Services (SNS, SES) - Global, Cost-effective     ║"
    echo "║  • MSG91 + Gupshup - India-focused, Simple setup       ║"
    echo "║  • Hybrid - Best of both worlds                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_costs() {
    echo -e "${YELLOW}"
    echo "💰 Cost Comparison (50K OTPs/month):"
    echo "┌─────────────────────────┬──────────────┬──────────────────┐"
    echo "│ Provider                │ Monthly Cost │ Best For         │"
    echo "├─────────────────────────┼──────────────┼──────────────────┤"
    echo "│ AWS SNS + DynamoDB      │ ₹2,200       │ High volume      │"
    echo "│ MSG91 SMS               │ ₹10,000      │ India-specific   │"
    echo "│ Gupshup WhatsApp        │ ₹6,250       │ WhatsApp users   │"
    echo "│ Hybrid (AWS + MSG91)    │ ₹6,000       │ Best reliability │"
    echo "└─────────────────────────┴──────────────┴──────────────────┘"
    echo -e "${NC}"
}

setup_aws() {
    echo -e "${GREEN}🔧 Setting up AWS OTP services...${NC}"
    
    read -p "Enter AWS Access Key ID: " aws_key
    read -s -p "Enter AWS Secret Access Key: " aws_secret
    echo
    read -p "Enter AWS Region (default: ap-south-1): " aws_region
    aws_region=${aws_region:-ap-south-1}
    
    echo -e "\n${BLUE}📱 SMS Configuration:${NC}"
    read -p "SMS Sender Name (default: PocketShield): " sms_sender
    sms_sender=${sms_sender:-PocketShield}
    
    echo -e "\n${BLUE}📧 Email Configuration:${NC}"
    read -p "SES Sender Email (e.g., noreply@yourdomain.com): " ses_email
    
    echo -e "\n${BLUE}🗄️ DynamoDB Configuration:${NC}"
    read -p "DynamoDB Table Name (default: pocketshield-otps): " dynamo_table
    dynamo_table=${dynamo_table:-pocketshield-otps}
    
    # Create AWS environment configuration
    cat >> backend/.env << EOF

# AWS OTP Configuration
OTP_PROVIDER=AWS
AWS_ACCESS_KEY_ID=${aws_key}
AWS_SECRET_ACCESS_KEY=${aws_secret}
AWS_REGION=${aws_region}

# SNS Configuration
SMS_SENDER_NAME=${sms_sender}
SNS_MAX_PRICE=0.50

# SES Configuration
SES_SENDER_EMAIL=${ses_email}

# DynamoDB Configuration
DYNAMODB_OTP_TABLE=${dynamo_table}

# AWS Services Enabled
ENABLE_AWS_SNS=true
ENABLE_AWS_SES=true
ENABLE_AWS_DYNAMODB=true
EOF

    echo -e "${GREEN}✅ AWS configuration added to backend/.env${NC}"
    echo -e "${YELLOW}📋 Next Steps:${NC}"
    echo "1. Create DynamoDB table: ${dynamo_table}"
    echo "2. Verify SES sender email: ${ses_email}"
    echo "3. Test SMS sending with your phone number"
    echo "4. Request SNS spending limit increase if needed"
}

setup_traditional() {
    echo -e "${GREEN}🔧 Setting up Traditional OTP providers (MSG91 + Gupshup)...${NC}"
    
    echo -e "\n${BLUE}📱 MSG91 SMS Configuration:${NC}"
    read -p "MSG91 Auth Key: " msg91_key
    read -p "MSG91 Sender ID (default: POCKET): " msg91_sender
    msg91_sender=${msg91_sender:-POCKET}
    
    echo -e "\n${BLUE}💬 Gupshup WhatsApp Configuration:${NC}"
    read -p "Gupshup API Key: " gupshup_key
    read -p "Gupshup App Name (default: PocketShield): " gupshup_app
    gupshup_app=${gupshup_app:-PocketShield}
    read -p "Gupshup Source Number (with country code): " gupshup_number
    
    # Create traditional provider configuration
    cat >> backend/.env << EOF

# Traditional OTP Configuration
OTP_PROVIDER=TRADITIONAL

# MSG91 SMS Configuration
SMS_PROVIDER=MSG91
MSG91_AUTH_KEY=${msg91_key}
MSG91_SENDER_ID=${msg91_sender}

# Gupshup WhatsApp Configuration
WHATSAPP_PROVIDER=GUPSHUP
GUPSHUP_API_KEY=${gupshup_key}
GUPSHUP_APP_NAME=${gupshup_app}
GUPSHUP_SOURCE_NUMBER=${gupshup_number}

# Services Enabled
ENABLE_SMS=true
ENABLE_WHATSAPP=true
EOF

    echo -e "${GREEN}✅ Traditional provider configuration added to backend/.env${NC}"
    echo -e "${YELLOW}📋 Next Steps:${NC}"
    echo "1. Verify MSG91 account and sender ID approval"
    echo "2. Test Gupshup WhatsApp integration"
    echo "3. Monitor delivery rates and costs"
}

setup_hybrid() {
    echo -e "${GREEN}🔧 Setting up Hybrid OTP configuration (AWS + Traditional fallback)...${NC}"
    
    echo -e "${PURPLE}This setup uses AWS SNS as primary (cost-effective) with MSG91/Gupshup as fallback (reliability)${NC}"
    
    echo -e "\n${BLUE}🔴 Primary: AWS Configuration${NC}"
    setup_aws
    
    echo -e "\n${BLUE}🟡 Fallback: Traditional Providers${NC}"
    echo "Adding fallback configuration..."
    
    read -p "MSG91 Auth Key (fallback SMS): " msg91_fallback
    read -p "Gupshup API Key (WhatsApp): " gupshup_fallback
    read -p "Gupshup Source Number: " gupshup_number_fallback
    
    # Add hybrid configuration
    cat >> backend/.env << EOF

# Hybrid Configuration - Fallback Providers
ENABLE_MSG91_FALLBACK=true
ENABLE_GUPSHUP_WHATSAPP=true

MSG91_AUTH_KEY=${msg91_fallback}
MSG91_SENDER_ID=POCKET

GUPSHUP_API_KEY=${gupshup_fallback}
GUPSHUP_SOURCE_NUMBER=${gupshup_number_fallback}

# Cost Optimization Settings
AWS_PRIMARY=true
FALLBACK_ON_AWS_FAILURE=true
COST_OPTIMIZATION=true
EOF

    echo -e "${GREEN}✅ Hybrid configuration completed${NC}"
    echo -e "${YELLOW}📋 Hybrid Strategy:${NC}"
    echo "1. 🔴 AWS SNS: Primary SMS delivery (cheapest)"
    echo "2. 🟡 MSG91: Fallback if AWS fails"
    echo "3. 💬 Gupshup: WhatsApp delivery (parallel)"
    echo "4. 📊 Cost optimization: ~60% savings vs pure traditional"
}

test_configuration() {
    echo -e "\n${BLUE}🧪 Testing OTP Configuration...${NC}"
    
    read -p "Enter your mobile number for testing (10 digits): " test_phone
    
    if [[ ! $test_phone =~ ^[6-9][0-9]{9}$ ]]; then
        echo -e "${RED}❌ Invalid Indian mobile number format${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Starting backend server...${NC}"
    cd backend
    npm install > /dev/null 2>&1 &
    
    # Wait for npm install
    wait
    
    # Start server in background
    npm start > server.log 2>&1 &
    SERVER_PID=$!
    
    sleep 5  # Wait for server to start
    
    echo -e "${BLUE}Testing OTP send...${NC}"
    
    # Test OTP sending
    response=$(curl -s -X POST http://localhost:3000/api/otp/send \
        -H "Content-Type: application/json" \
        -d "{\"phoneNumber\":\"${test_phone}\"}")
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ OTP sent successfully!${NC}"
        echo -e "${YELLOW}Check your phone for SMS/WhatsApp${NC}"
        
        read -p "Enter received OTP to verify: " received_otp
        
        # Test OTP verification
        verify_response=$(curl -s -X POST http://localhost:3000/api/otp/verify \
            -H "Content-Type: application/json" \
            -d "{\"phoneNumber\":\"${test_phone}\",\"otp\":\"${received_otp}\"}")
        
        if echo "$verify_response" | grep -q '"success":true'; then
            echo -e "${GREEN}🎉 OTP verification successful! Your setup is working perfectly.${NC}"
        else
            echo -e "${RED}❌ OTP verification failed. Check the OTP and try again.${NC}"
        fi
    else
        echo -e "${RED}❌ OTP sending failed. Check your configuration.${NC}"
        echo "Response: $response"
    fi
    
    # Stop server
    kill $SERVER_PID 2>/dev/null || true
    cd ..
}

show_summary() {
    echo -e "\n${GREEN}🎉 PocketShield OTP Setup Complete!${NC}"
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                     📊 Setup Summary                     ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${YELLOW}Configuration File:${NC} backend/.env"
    echo -e "${YELLOW}API Documentation:${NC} http://localhost:3000/api-docs"
    echo -e "${YELLOW}Health Check:${NC} http://localhost:3000/api/otp/health"
    
    if [[ $SETUP_TYPE == "aws" ]]; then
        echo -e "${YELLOW}AWS Health Check:${NC} http://localhost:3000/api/aws-otp/health"
        echo -e "${YELLOW}Cost Estimation:${NC} http://localhost:3000/api/aws-otp/cost-estimate"
    fi
    
    echo -e "\n${BLUE}🚀 Start Backend Server:${NC}"
    echo "cd backend && npm start"
    
    echo -e "\n${BLUE}📱 Update Mobile App:${NC}"
    echo "Update src/services/otpService.js with your server URL"
    
    echo -e "\n${BLUE}🔧 Production Deployment:${NC}"
    echo "./deploy.sh"
    
    echo -e "\n${PURPLE}💡 Pro Tips:${NC}"
    echo "• Monitor costs in AWS Console or provider dashboards"
    echo "• Set up billing alerts for cost control"
    echo "• Use hybrid setup for best cost + reliability balance"
    echo "• Test with real phone numbers before production"
}

main() {
    print_header
    print_costs
    
    echo -e "${BLUE}Select OTP Provider Setup:${NC}"
    echo "1) 🌐 AWS Services (SNS + SES + DynamoDB)"
    echo "2) 🇮🇳 Traditional (MSG91 + Gupshup)"
    echo "3) 🔄 Hybrid (AWS Primary + Traditional Fallback)"
    echo "4) ℹ️  Compare Providers"
    echo "5) 🧪 Test Existing Configuration"
    echo "6) ❌ Exit"
    
    read -p "Enter your choice (1-6): " choice
    
    case $choice in
        1)
            SETUP_TYPE="aws"
            setup_aws
            ;;
        2)
            SETUP_TYPE="traditional"
            setup_traditional
            ;;
        3)
            SETUP_TYPE="hybrid"
            setup_hybrid
            ;;
        4)
            print_costs
            echo -e "\n${BLUE}📊 Detailed Comparison:${NC}"
            echo -e "${GREEN}AWS Pros:${NC} Lower cost at scale, global reach, integrated with other AWS services"
            echo -e "${RED}AWS Cons:${NC} Complex setup, requires AWS knowledge, SMS delivery varies by region"
            echo -e "${GREEN}Traditional Pros:${NC} India-focused, simple setup, proven delivery rates"
            echo -e "${RED}Traditional Cons:${NC} Higher cost, limited to specific regions"
            echo -e "${PURPLE}Hybrid Pros:${NC} Best cost + reliability, graceful fallback, optimized for India"
            main
            ;;
        5)
            test_configuration
            ;;
        6)
            echo -e "${BLUE}Goodbye! 👋${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice. Please try again.${NC}"
            main
            ;;
    esac
    
    if [[ $choice != 4 && $choice != 5 ]]; then
        echo -e "\n${YELLOW}Would you like to test the configuration now? (y/n):${NC}"
        read -p "" test_now
        
        if [[ $test_now =~ ^[Yy]$ ]]; then
            test_configuration
        fi
        
        show_summary
    fi
}

# Check if running from correct directory
if [ ! -f "backend/package.json" ]; then
    echo -e "${RED}❌ Please run this script from the PocketShield root directory${NC}"
    exit 1
fi

# Create backend/.env if it doesn't exist
if [ ! -f "backend/.env" ]; then
    cp backend/config/production.env backend/.env
    echo -e "${YELLOW}📝 Created backend/.env from template${NC}"
fi

# Run main function
main "$@"
