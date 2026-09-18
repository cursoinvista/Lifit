export const Role = Object.freeze({
  STUDENT: 'STUDENT',
  INSTRUCTOR: 'INSTRUCTOR',
  OBSERVER: 'OBSERVER',
});

export function isValidRole(role) {
  return Object.values(Role).includes(role);
}
