const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'El correo electrónico no es válido.',
  'auth/user-disabled': 'Esta cuenta fue deshabilitada.',
  'auth/user-not-found': 'No existe una cuenta con ese correo.',
  'auth/wrong-password': 'La contraseña es incorrecta.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Intenta de nuevo más tarde.',
};

export function firebaseAuthErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code && MESSAGES[code]) {
    return MESSAGES[code];
  }
  return 'Ocurrió un error inesperado. Intenta nuevamente.';
}
