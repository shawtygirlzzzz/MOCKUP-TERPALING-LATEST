
<script setup lang="ts">
import type { PropertyItem } from "../types";

const props = defineProps<{
  items: PropertyItem[];
  signature: string;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  change: [items: PropertyItem[]];
}>();

function getTodayDate(): string {
  const today = new Date();

  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = String(today.getFullYear()).slice(-2);

  return `${day}/${month}/${year}`;
}

function handleCheckboxChange(
  index: number,
  checked: boolean
) {
  if (props.readonly) return;

  const current = props.items[index];

  if (!current || !current.required) return;
  if (checked && !props.signature) return;

  const updated = props.items.map((item, i) => {
    if (i !== index) {
      return { ...item };
    }

    return {
      ...item,
      received: checked,
      date: checked ? getTodayDate() : "",
      signature: checked ? "SIGNED" : "",
    };
  });

  emit("change", updated);
}
</script>

<template>
  <v-list
    lines="two"
    class="rounded-lg border"
  >
    <v-list-subheader>
      A) HR INDUCTION ACKNOWLEDGEMENT FORM
    </v-list-subheader>

    <v-list-item
      v-for="(item, index) in items"
      :key="item.id"
      class="py-3"
    >
      <v-row align="center">
        <!-- TOPIC -->
        <v-col cols="12" md="5">
          <div class="d-flex align-center ga-2">
            <span
              class="text-caption text-medium-emphasis"
              style="min-width: 24px"
            >
              {{ index + 1 }}.
            </span>

            <v-checkbox
              :model-value="item.received"
              :disabled="
                readonly ||
                !item.required ||
                (!item.received && !signature)
              "
              :label="item.label"
              color="primary"
              density="compact"
              hide-details
              @update:model-value="
                handleCheckboxChange(index, !!$event)
              "
            />
          </div>
        </v-col>

        <!-- AUTO DATE -->
        <v-col cols="12" sm="6" md="3">
          <v-text-field
            :model-value="item.date"
            label="Date acknowledged"
            placeholder="DD/MM/YY"
            variant="filled"
            density="comfortable"
            readonly
            :disabled="!item.received"
            hide-details
          />
        </v-col>

        <!-- AUTO SIGNATURE -->
        <v-col cols="12" sm="6" md="4">
          <div class="signature-display">
            <span class="text-caption text-medium-emphasis">
              Employee signature
            </span>

            <img
              v-if="item.signature && signature"
              :src="signature"
              alt="Employee signature"
              class="signature-image"
            />

            <span
              v-else
              class="text-body-2 text-medium-emphasis"
            >
              Not acknowledged
            </span>
          </div>
        </v-col>
      </v-row>
    </v-list-item>
  </v-list>
</template>

<style scoped>
.signature-display {
  min-height: 68px;
  padding: 6px 12px;
  border-bottom: 1px solid #94a3b8;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.signature-image {
  max-width: 220px;
  max-height: 55px;
  object-fit: contain;
  object-position: left center;
}
</style>
