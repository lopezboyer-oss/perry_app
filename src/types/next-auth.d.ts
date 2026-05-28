import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      accessSafetyDedicado?: boolean;
      accessVehicles?: boolean;
      accessDrivers?: boolean;
      accessElevationEquip?: boolean;
    };
  }

  interface User {
    role: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    accessSafetyDedicado?: boolean;
    accessVehicles?: boolean;
    accessDrivers?: boolean;
    accessElevationEquip?: boolean;
  }
}
