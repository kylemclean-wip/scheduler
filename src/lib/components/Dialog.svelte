<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';

	type Props = {
		open: boolean;
		top?: boolean;
		gap?: string;
		padding?: string;
		onClickBackdrop?: (e: MouseEvent) => void;
		onEscape?: (e: KeyboardEvent) => void;
	} & (
		| {
				pages: T[];
				renderPage: Snippet<[T, (newPage: T) => void]>;
		  }
		| {
				children: Snippet;
		  }
	);

	const { open, top, gap, padding, onClickBackdrop, onEscape, ...props }: Props = $props();

	let dialogElement: HTMLDialogElement | undefined = $state(undefined);
	let page = $state('pages' in props ? props.pages[0] : ('' as T));

	function onClick(e: MouseEvent) {
		if (!dialogElement || (e.clientX === 0 && e.clientY === 0)) return;

		const dialogRect = dialogElement.getBoundingClientRect();
		if (
			e.clientX < dialogRect.left ||
			e.clientX > dialogRect.right ||
			e.clientY < dialogRect.top ||
			e.clientY > dialogRect.bottom
		) {
			onClickBackdrop?.(e);
		}
	}

	$effect(() => {
		dialogElement?.showModal();
	});
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<dialog
		bind:this={dialogElement}
		onclick={onClick}
		class={{ top }}
		data-page={page ? page : undefined}
		style:--dialog-gap={gap ? gap : 'initial'}
		style:--dialog-padding={padding ? padding : 'initial'}
	>
		{#if 'pages' in props}
			{@render props.renderPage(page, (newPage) => (page = newPage))}
		{:else}
			{@render props.children()}
		{/if}
	</dialog>
{/if}

<svelte:document
	onkeydown={(e) => {
		if (e.key !== 'Escape' || !dialogElement) return;

		const openDialogs = [...document.querySelectorAll('dialog[open]')];
		if (openDialogs.at(-1) !== dialogElement) return;

		e.preventDefault();
		e.stopImmediatePropagation();

		onEscape?.(e);
	}}
/>

<style>
	dialog {
		display: flex;
		flex-direction: column;
		gap: var(--dialog-gap, 0.5rem);
		background-color: var(--main-bg-color);
		color: var(--main-fg-color);
		max-width: 600px;
		width: 100%;
		border: 1px solid var(--border-color);
		border-radius: 8px;
		margin: auto;
		padding: var(--dialog-padding, 1rem);

		&::backdrop {
			background-color: rgba(0, 0, 0, 0.5);
		}
	}

	dialog.top {
		margin-top: 50px;
	}
</style>
