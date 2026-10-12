import type { FieldValues, Path, UseFormRegister } from 'react-hook-form';

/**
 * react-hook-form's register() for MUI TextField: the ref goes to the real <input>
 * (inputRef) so focus-on-error and value syncing work.
 */
export function muiField<T extends FieldValues>(register: UseFormRegister<T>, name: Path<T>) {
  const { ref, ...rest } = register(name);
  return { ...rest, inputRef: ref };
}
