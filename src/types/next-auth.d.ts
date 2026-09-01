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
      accessManPower?: boolean;
      accessCrearPlanes?: boolean;
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
    accessManPower?: boolean;
    accessCrearPlanes?: boolean;
  }
}
