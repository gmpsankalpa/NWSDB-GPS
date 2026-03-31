// Office and Role Configuration for NWSDB Multi-Office System

export const OFFICES = {
  REGIONAL_ENGINEER: 'Regional Engineer Office',
  DAMBULLA: 'Dambulla Acting Office',
  ABANGAGA: 'Abangaga Acting Office',
  NAULA: 'Naula Acting Office',
  GALEWELA: 'Galewela Acting Office'
} as const;

export type Office = typeof OFFICES[keyof typeof OFFICES];

export const ROLES = {
  REGIONAL_ENGINEER: 'Regional Engineer',
  ACTING_OFFICER: 'Acting Officer',
  DEVELOPER: 'Developer'
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export interface User {
  id?: string; // Firestore document ID (for Acting Officers)
  email: string;
  role: Role;
  office: Office;
  name: string;
  password?: string; // For Acting Officers (stored in Firestore)
}

// Office List for Dropdowns
export const OFFICE_LIST: { value: Office; label: string; code: string }[] = [
  { value: OFFICES.REGIONAL_ENGINEER, label: 'Regional Engineer Office', code: 'REO' },
  { value: OFFICES.DAMBULLA, label: 'Dambulla Acting Office', code: 'DAM' },
  { value: OFFICES.ABANGAGA, label: 'Abangaga Acting Office', code: 'ABA' },
  { value: OFFICES.NAULA, label: 'Naula Acting Office', code: 'NAU' },
  { value: OFFICES.GALEWELA, label: 'Galewela Acting Office', code: 'GAL' }
];

// Default credentials for each office (In production, use proper authentication)
export const OFFICE_CREDENTIALS: Record<string, { email: string; password: string; role: Role; office: Office; name: string }> = {
  // Regional Engineer - Full Access
  'aedambullanwsdb@gmail.com': {
    email: 'aedambullanwsdb@gmail.com',
    password: '',
    role: ROLES.REGIONAL_ENGINEER,
    office: OFFICES.REGIONAL_ENGINEER,
    name: 'Regional Engineer'
  },
  
  // Developer Access
  'malithapiumal02@gmail.com': {
    email: 'malithapiumal02@gmail.com',
    password: '',
    role: ROLES.DEVELOPER,
    office: OFFICES.REGIONAL_ENGINEER,
    name: 'Developer'
  },
  
  // Acting Officers
  'dambullawss@gmail.com': {
    email: 'dambullawss@gmail.com',
    password: '',
    role: ROLES.ACTING_OFFICER,
    office: OFFICES.DAMBULLA,
    name: 'Dambulla Acting Officer'
  },
  'oicambanganaga@gmail.com': {
    email: 'oicambanganaga@gmail.com',
    password: '',
    role: ROLES.ACTING_OFFICER,
    office: OFFICES.ABANGAGA,
    name: 'Abangaga Acting Officer'
  },
  'oicnaula2020@gmail.com': {
    email: 'oicnaula2020@gmail.com',
    password: '',
    role: ROLES.ACTING_OFFICER,
    office: OFFICES.NAULA,
    name: 'Naula Acting Officer'
  },
  'galewelawss@gmail.com': {
    email: 'galewelawss@gmail.com',
    password: '',
    role: ROLES.ACTING_OFFICER,
    office: OFFICES.GALEWELA,
    name: 'Galewela Acting Officer'
  }
};

// Helper function to check if user has access to office data
export const hasOfficeAccess = (userOffice: Office, userRole: Role, dataOffice: Office): boolean => {
  // Regional Engineer has access to all offices
  if (userRole === ROLES.REGIONAL_ENGINEER) {
    return true;
  }
  
  // Acting Officers can only access their own office data
  return userOffice === dataOffice;
};

// Get office code for file numbering
export const getOfficeCode = (office: Office): string => {
  const officeConfig = OFFICE_LIST.find(o => o.value === office);
  return officeConfig?.code || 'UNK';
};

// Generate file number with office code
export const generateFileNumber = (office: Office, year: number, sequence: number): string => {
  const code = getOfficeCode(office);
  return `WC/${code}/${year}/${String(sequence).padStart(4, '0')}`;
};
