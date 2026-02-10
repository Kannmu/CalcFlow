<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import katex from 'katex'

let katexCssLoaded = false
async function ensureKatexCss() {
  if (katexCssLoaded) return
  await import('katex/dist/katex.min.css')
  katexCssLoaded = true
}

const props = defineProps({
  latex: {
    type: String,
    required: true
  },
  displayMode: {
    type: Boolean,
    default: false
  }
})

const latexElement = ref(null)

const renderLaTeX = async () => {
  if (!latexElement.value) return

  try {
    await ensureKatexCss()
    katex.render(props.latex, latexElement.value, {
      displayMode: props.displayMode,
      throwOnError: false,
      trust: false,
      strict: false
    })
  } catch (error) {
    console.error('LaTeX Render Error:', error)
    latexElement.value.innerHTML = `<span style="color: red;">LaTeX Render Error: ${error.message}</span>`
  }
}

onMounted(() => {
  nextTick(() => {
    renderLaTeX()
  })
})

watch(() => props.latex, () => {
  nextTick(() => {
    renderLaTeX()
  })
})
</script>

<template>
  <div ref="latexElement" class="latex-container" data-testid="latex-container"></div>
</template>

<style scoped>
.latex-container {
  display: inline-block;
}
</style>
