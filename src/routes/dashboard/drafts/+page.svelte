<script lang="ts">
	import ThreadList from '@/lib/components/dashboard/ThreadList.svelte';
	import Separator from '@/lib/components/Separator.svelte';

	const { data } = $props();
</script>

<h1 class="padded-container">Drafts</h1>
<Separator />

<ThreadList items={data.threads} agent={data.loggedInUser?.clientData.agent ?? null}>
	<div class="padded-container">No drafts have been created yet.</div>
</ThreadList>
