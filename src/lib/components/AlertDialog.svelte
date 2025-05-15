<script module lang="ts">
	import { mount, unmount, type ComponentProps } from 'svelte';
	import AlertDialog from './AlertDialog.svelte';

	// https://github.com/microsoft/TypeScript/issues/46361#issuecomment-943476893
	type DistributiveOmit<T, K extends string | number | symbol> = T extends any ? Omit<T, K> : never;

	export function showAlertDialog(
		props: DistributiveOmit<ComponentProps<typeof AlertDialog>, 'unmount'>
	) {
		const alert = mount(AlertDialog, {
			target: document.body,
			props: { ...props, unmount: () => unmount(alert) }
		});
	}

	export function showConfirmDialog({
		text,
		confirm,
		cancel
	}: {
		text: string[];
		confirm?: { text?: string; class?: string; onClick?: ButtonOnClick };
		cancel?: { text?: string; class?: string; onClick?: ButtonOnClick };
	}) {
		showAlertDialog({
			text,
			buttons: [
				{ text: confirm?.text ?? 'OK', class: confirm?.class, onClick: confirm?.onClick },
				{ text: cancel?.text ?? 'Cancel', class: cancel?.class, onClick: cancel?.onClick }
			]
		});
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import Dialog from './Dialog.svelte';

	export type ButtonOnClick = () => 'keepOpen' | undefined | void;

	type Props = ({ children: Snippet } | { text: string[] }) & {
		buttons?: { text: string; class?: string; onClick?: ButtonOnClick }[];
		unmount: () => void;
	};

	const props: Props = $props();

	function close() {
		props.unmount();
	}
</script>

<Dialog open>
	{#if 'children' in props}
		{@render props.children()}
	{:else}
		<div>
			{#each props.text as line}
				<p>{line}</p>
			{/each}
		</div>
	{/if}
	<div class="buttons">
		{#each props.buttons ?? [{ text: 'OK' }] as { text, class: cls, onClick }}
			<button
				type="button"
				class={cls}
				onclick={() => {
					if (!onClick || onClick() !== 'keepOpen') close();
				}}>{text}</button
			>
		{/each}
	</div>
</Dialog>

<style>
	.buttons {
		display: flex;
		flex-direction: row;
		justify-content: end;
		gap: 0.5rem;
	}
</style>
