<script lang="ts">
import PolygonEditor from "$lib/components/polygon/PolygonEditor.svelte";
import Preview from "$lib/components/preview/Preview.svelte";
import Schedule from "$lib/components/schedule/Schedule.svelte";
import FullPage from "$lib/components/scroll/FullPage.svelte";
import ScrollContainer from "$lib/components/scroll/ScrollContainer.svelte";
</script>

<ScrollContainer tabs={['Preview', 'Settings']}>
	<FullPage>
		<div class="centered">
			<Preview></Preview>
		</div>
	</FullPage>
	<FullPage>
		<div class="centered">
			<Schedule></Schedule>
		</div>
		<div class="centered">
            <PolygonEditor></PolygonEditor>
		</div>
	</FullPage>
</ScrollContainer>

<style>
.centered {
    display: flex;
    justify-content: center;
}
</style>