<script lang="ts">
	import Schedule from "$lib/components/schedule/Schedule.svelte";
	import FullPage from "$lib/components/scroll/FullPage.svelte";
	import ScrollContainer from "$lib/components/scroll/ScrollContainer.svelte";


</script>
<ScrollContainer tabs={['Preview', 'Settings']}>
	<FullPage>
	</FullPage>
	<FullPage>
		<div class="centered">
			<Schedule></Schedule>
		</div>
	</FullPage>
</ScrollContainer>

<style>
.centered {
	display: flex;
	justify-content: center;
}
</style>