<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		PackageOpenIcon,
		CalendarDaysIcon,
		NotepadTextDashedIcon,
		SettingsIcon,
		SquarePenIcon,
		MenuIcon
	} from 'lucide-svelte';
	import { Agent } from '@atproto/api';
	import Avatar from '$lib/components/Avatar.svelte';
	import ThreadEditorDialog from '$lib/components/dashboard/post-editor/ThreadEditorDialog.svelte';
	import { requireNonNull } from '$lib/require-non-null';
	import { clientLoginUrl } from '@/lib/client-login';
	import type { EditableThread } from '@/lib/entities/thread';

	const { children, data } = $props();
	requireNonNull(data.loggedInUser);

	const profile = $derived(data.loggedInUser.clientData.profile);

	const usernameParts = $derived.by(() => {
		const handle = data.loggedInUser.clientData.profile.handle;
		return [handle.slice(0, handle.indexOf('.')), handle.slice(handle.indexOf('.'))] as const;
	});

	let threadEditorDialogOpen = $state(false);

	function openThreadEditor(initialThread?: EditableThread) {
		if (!data.loggedInUser?.clientData.agent) {
			goto(clientLoginUrl());
			return;
		}

		threadEditorDialogOpen = false;
		threadEditorDialogOpen = true;
	}

	function onClickNewPostButton() {
		mainSidebarOpen = false;
		openThreadEditor();
	}

	let mainSidebarOpen = $state(false);
</script>

<div class="content">
	<div class="top-bar padded-container">
		<div>
			<details class="main-sidebar-opener" bind:open={mainSidebarOpen}>
				<summary class="button ghost">
					<MenuIcon />
				</summary>
			</details>
		</div>

		<div>
			<a
				class="logo button ghost"
				href="/dashboard"
				title="Scheduler"
				onclick={() => (mainSidebarOpen = false)}
			>
				<PackageOpenIcon size="2rem" />
			</a>
		</div>

		<div></div>
	</div>

	<div class="sidebar main-sidebar">
		<nav class="links">
			<a
				class="logo button ghost"
				href="/dashboard"
				title="Scheduler"
				onclick={() => (mainSidebarOpen = false)}
			>
				<PackageOpenIcon />
				<div class="button-label">Scheduler</div>
			</a>

			<a
				class="button ghost"
				href="/dashboard/scheduled"
				title="Scheduled"
				onclick={() => (mainSidebarOpen = false)}
			>
				<CalendarDaysIcon />
				<div class="button-label">Scheduled</div>
			</a>
			<a
				class="button ghost"
				href="/dashboard/drafts"
				title="Drafts"
				onclick={() => (mainSidebarOpen = false)}
			>
				<NotepadTextDashedIcon />
				<div class="button-label">Drafts</div>
			</a>
			<a
				class="button ghost"
				href="/dashboard/settings"
				title="Settings"
				onclick={() => (mainSidebarOpen = false)}
			>
				<SettingsIcon />
				<div class="button-label">Settings</div>
			</a>
			<button type="button" class="accent" onclick={onClickNewPostButton} title="New Post">
				<SquarePenIcon />
				<div class="button-label">New Post</div>
			</button>
		</nav>

		<div>
			<details class="logged-in-user">
				<summary class="button ghost">
					<Avatar avatarSrc={profile.avatar} handle={profile.handle} />
					<div class="username-parts button-label">
						<span>{usernameParts[0]}</span>
						<span>{usernameParts[1]}</span>
					</div>
				</summary>

				<div class="options">
					<form method="POST" action="/api/user/logout">
						<button type="submit" class="ghost">Log Out</button>
					</form>
				</div>
			</details>
		</div>
	</div>

	<main>
		{@render children()}
	</main>

	<div class="sidebar right-sidebar"></div>
</div>

{#if threadEditorDialogOpen && data.loggedInUser.clientData.agent}
	<ThreadEditorDialog
		bind:open={threadEditorDialogOpen}
		author={{ handle: profile.handle, avatarSrc: profile.avatar }}
		agent={data.loggedInUser.clientData.agent}
	/>
{/if}

<style>
	details > summary {
		list-style: none;
	}

	.content {
		display: flex;
		flex-direction: row;
		min-height: 100vh;
		justify-content: center;

		--sidebar-width: 240px;
		--sidebar-button-aspect-ratio: unset;
		--sidebar-button-labels: unset;
		--sidebar-links-alignment: start;
	}

	.top-bar {
		display: none;
	}

	@media (max-width: 1080px) {
		.sidebar.right-sidebar {
			display: none;
		}
	}

	@media (max-width: 840px) {
		.content {
			--sidebar-width: 4.5rem;
			--sidebar-button-aspect-ratio: 1/1;
			--sidebar-button-labels: none;
			--sidebar-links-alignment: center;
		}
	}

	@media (max-width: 500px) {
		.content {
			flex-direction: column;
			justify-content: start;
		}

		.top-bar {
			position: sticky;
			top: 0;
			display: flex;
			flex-direction: row;
			align-items: stretch;
			border-bottom: 1px solid var(--border-color);
			background-color: var(--main-bg-color);
			z-index: 2;

			> div {
				flex: 1;
			}

			.logo.button {
				padding: 0;
				height: 100%;
			}
		}

		.main-sidebar-opener {
			width: fit-content;

			> summary {
				display: flex;
				justify-content: center;
				align-items: center;
			}
		}

		.sidebar.main-sidebar.main-sidebar {
			display: none;
			position: static;
			top: unset;
		}

		.top-bar:has(.main-sidebar-opener[open]) {
			+ .sidebar.main-sidebar.main-sidebar {
				--sidebar-width: 100%;
				--sidebar-button-aspect-ratio: initial;
				--sidebar-button-labels: initial;
				--sidebar-links-alignment: start;

				display: block;
				background-color: var(--main-bg-color);
				z-index: 1;

				.logo {
					display: none;
				}
			}

			~ main {
				display: none;
			}
		}

		.content main {
			width: unset;
			border: none;
		}
	}

	.sidebar.main-sidebar {
		min-width: var(--sidebar-width);
		max-width: var(--sidebar-width);
		overflow-wrap: anywhere;
		padding: 0.5rem;
		position: sticky;
		top: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;

		.links {
			flex: 1;
			display: flex;
			flex-direction: column;

			.logo {
				display: flex;
				flex-direction: row;
				align-items: center;
				font-size: 1.5rem;
				font-weight: bold;
				margin-bottom: 0.5rem;
			}

			a {
				justify-content: var(--sidebar-links-alignment);
				padding-inline: 0;
				display: flex;
				flex-direction: row;
				gap: 0.6rem;
			}

			.accent {
				margin-top: 0.5rem;
			}
		}

		.button,
		button {
			aspect-ratio: var(--sidebar-button-aspect-ratio);

			.button-label,
			.username-parts.button-label {
				display: var(--sidebar-button-labels);
			}
		}
	}

	.logged-in-user {
		summary {
			display: flex;
			flex-direction: row;
			justify-content: var(--sidebar-links-alignment);
			gap: 0.75rem;
		}

		.username-parts {
			display: block;

			span {
				display: inline-block;
			}
		}

		.options {
			display: flex;
			flex-direction: column;
			border: 1px solid var(--border-color);
			border-radius: 8px;
			padding: 0.25rem;
			margin-top: 0.25rem;

			button {
				justify-content: start;
			}

			form {
				display: contents;
			}
		}
	}

	main {
		max-width: 600px;
		flex: 1;
		width: 0;
		border-inline: 1px solid var(--border-color);
	}
</style>
