
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

const emit = defineEmits<{
  save: [signature: string];
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
const isDrawing = ref(false);
const hasDrawing = ref(false);

let context: CanvasRenderingContext2D | null = null;
let lastX = 0;
let lastY = 0;

function setupCanvas() {
  const element = canvas.value;
  if (!element) return;

  const rect = element.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;

  element.width = Math.round(rect.width * ratio);
  element.height = Math.round(rect.height * ratio);

  context = element.getContext("2d");
  if (!context) return;

  context.scale(ratio, ratio);
  context.strokeStyle = "#172554";
  context.lineWidth = 2.5;
  context.lineCap = "round";
  context.lineJoin = "round";
}

function getPosition(event: PointerEvent) {
  const rect = canvas.value!.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function startDrawing(event: PointerEvent) {
  if (!canvas.value || !context) return;

  event.preventDefault();
  canvas.value.setPointerCapture(event.pointerId);

  const position = getPosition(event);

  lastX = position.x;
  lastY = position.y;

  isDrawing.value = true;
  hasDrawing.value = true;

  context.beginPath();
  context.moveTo(lastX, lastY);
  context.lineTo(lastX, lastY);
  context.stroke();
}

function draw(event: PointerEvent) {
  if (!isDrawing.value || !context) return;

  event.preventDefault();

  const position = getPosition(event);

  context.beginPath();
  context.moveTo(lastX, lastY);
  context.lineTo(position.x, position.y);
  context.stroke();

  lastX = position.x;
  lastY = position.y;
}

function stopDrawing() {
  isDrawing.value = false;
}

function clearSignature() {
  const element = canvas.value;
  if (!element || !context) return;

  // Reset the canvas bitmap without changing
  // its configured CSS dimensions.
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(
    0,
    0,
    element.width,
    element.height
  );
  context.restore();

  hasDrawing.value = false;
}

function saveSignature() {
  if (!canvas.value || !hasDrawing.value) return;

  emit(
    "save",
    canvas.value.toDataURL("image/png")
  );
}

onMounted(setupCanvas);
onBeforeUnmount(stopDrawing);
</script>

<template>
  <v-card variant="outlined" rounded="lg">
    <v-card-title class="text-subtitle-1">
      Employee Electronic Signature
    </v-card-title>

    <v-card-subtitle>
      Draw your signature before completing
      the HR Induction checklist.
    </v-card-subtitle>

    <v-card-text>
      <div class="signature-area">
        <canvas
          ref="canvas"
          class="signature-canvas"
          @pointerdown="startDrawing"
          @pointermove="draw"
          @pointerup="stopDrawing"
          @pointercancel="stopDrawing"
          @lostpointercapture="stopDrawing"
        />
      </div>

      <p class="text-caption mt-2">
        Use your mouse, finger, or stylus to sign.
      </p>
    </v-card-text>

    <v-card-actions>
      <v-btn
        variant="outlined"
        @click="clearSignature"
      >
        Clear
      </v-btn>

      <v-spacer />

      <v-btn
        color="primary"
        :disabled="!hasDrawing"
        @click="saveSignature"
      >
        Save Signature
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.signature-area {
  width: 100%;
  height: 180px;
  background: #ffffff;
  border: 1px dashed #94a3b8;
  border-radius: 8px;
  overflow: hidden;
}

.signature-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}
</style>
