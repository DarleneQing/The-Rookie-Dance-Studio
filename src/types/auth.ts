export enum AuthMode {
  LOGIN = 'login',
  REGISTER = 'register',
}

export interface FormErrors {
  email?: string;
  username?: string;
  full_name?: string;
  password?: string;
  confirmPassword?: string;
  dob?: string;
}


