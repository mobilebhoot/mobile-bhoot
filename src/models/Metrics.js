// Metrics Data Transfer Objects (DTOs)

export const Metrics = {
  // Contacts DTO
  Contacts: {
    total: 0,
    recent: [],
    suspicious: [],
    lastUpdated: null,
    hasPermission: false,
    preview: []
  },

  // SMS Stats DTO
  SmsStats: {
    total: 0,
    recent: [],
    suspicious: [],
    spam: 0,
    phishing: 0,
    lastUpdated: null,
    hasPermission: false,
    preview: []
  },

  // Call Stats DTO
  CallStats: {
    total: 0,
    recent: [],
    suspicious: [],
    spam: 0,
    blocked: 0,
    lastUpdated: null,
    hasPermission: false,
    preview: []
  },

  // Apps DTO
  Apps: {
    total: 0,
    installed: [],
    risky: [],
    permissions: {},
    lastUpdated: null,
    hasPermission: false,
    preview: []
  },

  // Device DTO
  Device: {
    model: '',
    os: '',
    version: '',
    security: {},
    health: {},
    lastUpdated: null,
    hasPermission: false
  }
};

// Demo Data for when permissions are denied
export const DemoData = {
  contacts: {
    total: 156,
    recent: [
      { name: 'John Doe', phone: '+1-555-0123', lastContact: '2024-01-15', risk: 'low' },
      { name: 'Jane Smith', phone: '+1-555-0456', lastContact: '2024-01-14', risk: 'low' },
      { name: 'Unknown Caller', phone: '+1-555-0789', lastContact: '2024-01-13', risk: 'high' }
    ],
    suspicious: [
      { name: 'Unknown Caller', phone: '+1-555-0789', reason: 'Suspicious number pattern', risk: 'high' }
    ],
    lastUpdated: new Date().toISOString(),
    hasPermission: false,
    preview: [
      { name: 'John Doe', phone: '+1-555-0123' },
      { name: 'Jane Smith', phone: '+1-555-0456' },
      { name: 'Unknown Caller', phone: '+1-555-0789' }
    ]
  },

  sms: {
    total: 1247,
    recent: [
      { sender: '+1-555-0123', message: 'Hey, how are you?', timestamp: '2024-01-15T10:30:00Z', risk: 'low' },
      { sender: '+1-555-0456', message: 'Meeting at 3pm', timestamp: '2024-01-15T09:15:00Z', risk: 'low' },
      { sender: 'UNKNOWN', message: 'You have won $1000! Click here: bit.ly/suspicious', timestamp: '2024-01-15T08:45:00Z', risk: 'high' }
    ],
    suspicious: [
      { sender: 'UNKNOWN', message: 'You have won $1000! Click here: bit.ly/suspicious', reason: 'Phishing attempt detected', risk: 'high' }
    ],
    spam: 23,
    phishing: 5,
    lastUpdated: new Date().toISOString(),
    hasPermission: false,
    preview: [
      { sender: '+1-555-0123', preview: 'Hey, how are you?' },
      { sender: '+1-555-0456', preview: 'Meeting at 3pm' },
      { sender: 'UNKNOWN', preview: 'You have won $1000! Click here...' }
    ]
  },

  callLog: {
    total: 89,
    recent: [
      { number: '+1-555-0123', name: 'John Doe', duration: 120, timestamp: '2024-01-15T10:30:00Z', type: 'incoming', risk: 'low' },
      { number: '+1-555-0456', name: 'Jane Smith', duration: 45, timestamp: '2024-01-15T09:15:00Z', type: 'outgoing', risk: 'low' },
      { number: '+1-555-0789', name: 'Unknown', duration: 0, timestamp: '2024-01-15T08:45:00Z', type: 'missed', risk: 'high' }
    ],
    suspicious: [
      { number: '+1-555-0789', name: 'Unknown', reason: 'Suspicious number pattern', risk: 'high' }
    ],
    spam: 12,
    blocked: 3,
    lastUpdated: new Date().toISOString(),
    hasPermission: false,
    preview: [
      { number: '+1-555-0123', name: 'John Doe', duration: '2:00' },
      { number: '+1-555-0456', name: 'Jane Smith', duration: '0:45' },
      { number: '+1-555-0789', name: 'Unknown', duration: '0:00' }
    ]
  },

  apps: {
    total: 45,
    installed: [
      { name: 'Chrome', package: 'com.android.chrome', version: '120.0.6099.216', risk: 'low', permissions: 8 },
      { name: 'Facebook', package: 'com.facebook.katana', version: '420.0.0.28.120', risk: 'medium', permissions: 15 },
      { name: 'Unknown App', package: 'com.unknown.app', version: '1.0.0', risk: 'high', permissions: 25 }
    ],
    risky: [
      { name: 'Unknown App', package: 'com.unknown.app', reason: 'Excessive permissions requested', risk: 'high' }
    ],
    permissions: {
      camera: 12,
      location: 18,
      microphone: 8,
      contacts: 5,
      sms: 3
    },
    lastUpdated: new Date().toISOString(),
    hasPermission: false,
    preview: [
      { name: 'Chrome', risk: 'low' },
      { name: 'Facebook', risk: 'medium' },
      { name: 'Unknown App', risk: 'high' }
    ]
  },

  device: {
    model: 'Pixel 7',
    os: 'Android',
    version: '14',
    security: {
      patchLevel: '2024-01-05',
      encryption: true,
      developerOptions: false,
      rootDetected: false
    },
    health: {
      battery: 78,
      storage: 65,
      memory: 45,
      temperature: 32
    },
    lastUpdated: new Date().toISOString(),
    hasPermission: true
  }
};

