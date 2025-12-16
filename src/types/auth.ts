export enum AuthMode {
  LOGIN = 'login',
  REGISTER = 'register',
  FORGOT_PASSWORD = 'forgot_password',
}

export interface FormErrors {
  email?: string;
  username?: string;
  full_name?: string;
  password?: string;
  confirmPassword?: string;
  dob?: string;
}


