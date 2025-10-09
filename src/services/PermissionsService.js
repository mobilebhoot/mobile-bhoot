import { PermissionsAndroid, Platform, Alert } from 'react-native';

export class PermissionsService {
  static async requestContactsPermission() {
    if (Platform.OS !== 'android') {
      return { granted: true, reason: 'iOS not supported' };
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        {
          title: 'Contacts Access',
          message: 'PocketShield needs access to your contacts to analyze communication patterns and detect potential security risks.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow',
        }
      );

      return {
        granted: granted === PermissionsAndroid.RESULTS.GRANTED,
        reason: granted === PermissionsAndroid.RESULTS.GRANTED ? 'Granted' : 'Denied by user'
      };
    } catch (error) {
      return { granted: false, reason: `Error: ${error.message}` };
    }
  }

  static async requestSmsPermission() {
    if (Platform.OS !== 'android') {
      return { granted: true, reason: 'iOS not supported' };
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Access',
          message: 'PocketShield needs access to your SMS to detect phishing attempts and suspicious messages.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow',
        }
      );

      return {
        granted: granted === PermissionsAndroid.RESULTS.GRANTED,
        reason: granted === PermissionsAndroid.RESULTS.GRANTED ? 'Granted' : 'Denied by user'
      };
    } catch (error) {
      return { granted: false, reason: `Error: ${error.message}` };
    }
  }

  static async requestCallLogPermission() {
    if (Platform.OS !== 'android') {
      return { granted: true, reason: 'iOS not supported' };
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        {
          title: 'Call Log Access',
          message: 'PocketShield needs access to your call logs to analyze communication patterns and detect potential security threats.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow',
        }
      );

      return {
        granted: granted === PermissionsAndroid.RESULTS.GRANTED,
        reason: granted === PermissionsAndroid.RESULTS.GRANTED ? 'Granted' : 'Denied by user'
      };
    } catch (error) {
      return { granted: false, reason: `Error: ${error.message}` };
    }
  }

  static async requestAllPermissions() {
    const results = {
      contacts: await this.requestContactsPermission(),
      sms: await this.requestSmsPermission(),
      callLog: await this.requestCallLogPermission(),
    };

    const allGranted = Object.values(results).every(result => result.granted);
    
    return {
      allGranted,
      results,
      summary: {
        granted: Object.values(results).filter(r => r.granted).length,
        total: Object.keys(results).length
      }
    };
  }

  static showPermissionRationale(permission, onAllow, onDeny) {
    const rationales = {
      contacts: {
        title: 'Why We Need Contacts Access',
        message: 'PocketShield analyzes your contacts to:\n\n• Detect suspicious communication patterns\n• Identify potential phishing attempts\n• Monitor for unauthorized contact access\n• Provide security insights about your network\n\nThis helps protect you from social engineering attacks and data breaches.',
        allowText: 'Allow Access',
        denyText: 'Use Demo Data'
      },
      sms: {
        title: 'Why We Need SMS Access',
        message: 'PocketShield scans your messages to:\n\n• Detect phishing and scam messages\n• Identify suspicious links and attachments\n• Monitor for unauthorized SMS access\n• Protect against SMS-based attacks\n\nThis helps keep your personal information safe from cybercriminals.',
        allowText: 'Allow Access',
        denyText: 'Use Demo Data'
      },
      callLog: {
        title: 'Why We Need Call Log Access',
        message: 'PocketShield analyzes your call logs to:\n\n• Detect unusual calling patterns\n• Identify potential spam and scam calls\n• Monitor for unauthorized call access\n• Protect against phone-based attacks\n\nThis helps secure your communication and personal data.',
        allowText: 'Allow Access',
        denyText: 'Use Demo Data'
      }
    };

    const rationale = rationales[permission];
    if (!rationale) return;

    Alert.alert(
      rationale.title,
      rationale.message,
      [
        {
          text: rationale.denyText,
          style: 'cancel',
          onPress: onDeny
        },
        {
          text: rationale.allowText,
          onPress: onAllow
        }
      ],
      { cancelable: false }
    );
  }
}

