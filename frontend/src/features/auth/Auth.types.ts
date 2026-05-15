export type AuthUser = {
  id: number;
  name: string;
  email: string;
  roles: string[];
  createdAt: string;
};

export type AuthSession = {
  user: AuthUser;
};

export type LoginFormValues = {
  email: string;
  password: string;
};

export type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type AuthMode = "login" | "register";
