<script setup>
import { ref, toRefs, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { generateRandomColor } from '../utils.js'

const emit = defineEmits(['update:content','update:header'])

const props = defineProps({
    header: String,
    content: [String, Number],
    isRef: Boolean,
    isResult: Boolean,
    isMissing: Boolean,
})


const { header } = toRefs(props)
const editableHeader = ref(header.value)

const headerInputRef = ref(null)
const contentInputRef = ref(null)

let __measureCanvas = null
let __measureContext = null
const adjustInputWidth = (inputElement, value) => {
    if (!inputElement) return
    if (!__measureCanvas) {
        __measureCanvas = document.createElement('canvas')
        __measureContext = __measureCanvas.getContext('2d')
    }
    const computedStyle = window.getComputedStyle(inputElement)
    __measureContext.font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`
    const textWidth = __measureContext.measureText(value || '').width
    const minWidth = Math.max(textWidth + 20, 30)
    inputElement.style.width = `${minWidth}px`
}

watch(editableHeader, (newValue) => {
    emit('update:header', newValue)
    nextTick(() => {
        adjustInputWidth(headerInputRef.value, newValue)
    })
})

const { content } = toRefs(props)
const internalContent = ref(content.value)

watch(content, (newValue) => {
    internalContent.value = newValue
    nextTick(() => {
        adjustInputWidth(contentInputRef.value, String(newValue))
    })
})

const isEditing = ref(false)
const editableContent = computed({
    get() {
        if (isEditing.value) {
            return internalContent.value
        }
        const content = internalContent.value
        if (typeof content === 'number') {
            const s = String(content)
            const absValue = Math.abs(content)
            const integerPartLength = Math.trunc(absValue).toString().length
            const decimalPart = s.split('.')[1]
            if (integerPartLength > 6 || (decimalPart && decimalPart.length > 3)) {
                return content.toExponential(4)
            }
        }
        return internalContent.value
    },
    set(val) {
        if (props.isResult || props.isRef) {
            return
        }
        const sVal = String(val).trim()
        let newValue
        if (sVal === '') {
            newValue = ''
        } else {
            const num = Number(sVal)
            if (!isNaN(num)) {
                newValue = num
            } else {
                newValue = sVal
            }
        }
        internalContent.value = newValue
        emit('update:content', newValue)
        nextTick(() => {
            adjustInputWidth(contentInputRef.value, String(newValue))
        })
    },
})

const elementBackgroundColor = computed(() => generateRandomColor(editableHeader.value + String(internalContent.value), 30, 70))

const showMenu = ref(false)
const menuPosition = ref({ x: 0, y: 0 })

const openMenu = (event) => {
    if (!props.isResult) return
    event.preventDefault()
    showMenu.value = true
    menuPosition.value = { x: event.clientX, y: event.clientY }
    document.addEventListener('click', handleClickOutside, true)
}

const handleClickOutside = (event) => {
    showMenu.value = false
    document.removeEventListener('click', handleClickOutside, true)
}

const copyToClipboard = () => {
    navigator.clipboard.writeText(internalContent.value)
}

onMounted(() => {
    nextTick(() => {
        adjustInputWidth(headerInputRef.value, editableHeader.value)
        adjustInputWidth(contentInputRef.value, String(internalContent.value))
    })
    
    return () => {
        document.removeEventListener('click', handleClickOutside, true)
    }
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside, true)
})

</script>

<template>
    <div class="element" :class="{ missing: props.isMissing }" :style="{ backgroundColor: elementBackgroundColor }">
        <div class="element-header">
            <div v-if="isRef" class="element-header-display">{{ editableHeader }}</div>
            <input v-else ref="headerInputRef" class="element-header-input" v-model="editableHeader" />
        </div>
        <hr class="element-header-line" />
        <div class="element-content" @contextmenu="openMenu">
            <div v-if="isResult || isRef" class="element-content-input">{{ editableContent }}</div>
            <input v-else ref="contentInputRef" class="element-content-input" v-model="editableContent" @focus="isEditing = true" @blur="isEditing = false" />
            <div v-if="showMenu" class="context-menu" :style="{ top: menuPosition.y + 'px', left: menuPosition.x + 'px' }">
                <div class="context-menu-item" @click="copyToClipboard">Copy</div>
            </div>
        </div>
    </div>
</template>

<style>
.element {
    border: 2px solid #000000;
    background-color: #ffffff;
    padding: 5px;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    width: auto;
    min-width: fit-content;
    height: auto;
    min-height: fit-content;
    border-radius: 8px;
}

.element.missing {
    border-color: #ef4444;
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

.element-header {
    width :100%;
}

.element-header:hover {
    background-color: rgba(255, 255, 255, 0.5);
    border-radius: 4px;
}

.element-header-input {
    color: #000000;
    background-color: transparent;
    font-size: 16px;
    font-weight: bold;
    border: none;
    text-align: center;
    width: auto;
    min-width: 1ch;
    border-radius: 4px;
}

.element-header-display {
    color: #000000;
    background-color: transparent;
    font-size: 16px;
    font-weight: bold;
    border: none;
    text-align: center;
    width: auto;
    min-width: 1ch;
    border-radius: 4px;
    padding: 0;
}

.element-header-input:focus {
    border: 2px;
    background-color: rgba(255, 255, 255, 0.5);
    outline: 1px solid #ffffff;
}

.element-header-line {
    border: none;
    height: 3px;
    background-color: #000000;
    width: 95%;
    margin: 0 0;
}

.element-content {
    width: 100%;
}

.element-content:hover {
    background-color: rgba(255, 255, 255, 0.5);
    border-radius: 4px;
}

.element-content-input {
    background-color: transparent;
    font-size: 16px;
    color: #000000;
    border: none;
    text-align: center;
    font-weight: bold;
    width: auto;
    min-width: 1ch;
    border-radius: 4px;
    padding: 0;
    line-height: normal;
}

.element-content-input:focus {
    border: 2px;
    background-color: rgba(255, 255, 255, 0.5);
    outline: 1px solid #ffffff;
}

.context-menu {
    position: fixed;
    background-color: rgb(255, 255, 255);
    border: 1px solid #848484;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.15);
    border-radius: 12px;
    z-index: 1000;
}

.context-menu-item {
    padding: 8px 12px;
    cursor: pointer;
    color: #000000;
}

.context-menu-item:hover {
    background-color: #c3c3c3;
    border-radius: 12px;
}
</style>
