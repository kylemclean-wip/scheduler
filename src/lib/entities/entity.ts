export type EntityOptions = { editable: boolean };

declare const nonEditableEntitySymbol: unique symbol;
declare const editableEntitySymbol: unique symbol;

export type Entity<T, E, O extends EntityOptions> = O extends { editable: true }
	? T & { editorState: E; __brand: typeof editableEntitySymbol }
	: T & { __brand: typeof nonEditableEntitySymbol };

export function stripEditorState<T, E>(
	editableEntity: Entity<T, E, { editable: true }>
): Entity<T, E, { editable: false }> {
	const { editorState, ...rest } = editableEntity;
	return rest as Entity<T, E, { editable: false }>;
}
