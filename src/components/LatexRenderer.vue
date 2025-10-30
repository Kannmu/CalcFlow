<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import katex from 'katex'
import 'katex/dist/katex.min.css'

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
  <div ref="latexElement" class="latex-container"></div>
</template>

<style scoped>
.latex-container {
  display: inline-block;
}
</style>
