<template lang="pug">
dt#media_library {{ $t('my_list') }} Media

dd
  .gap-top(:class="$style.sectionIntro")
    .gap-top(:class="$style.sectionHeader")
      div
        p(:class="$style.eyebrow") Media Library
        p(:class="$style.sectionTitle") Manage remote music sources
      .gap-top(:class="$style.createActions")
        base-btn.btn(min :disabled="isSaving || isScanningId != ''" @click="showCreate('smb')") Add SMB
        base-btn.btn.gap-left(min :disabled="isSaving || isScanningId != ''" @click="showCreate('webdav')") Add WebDAV
    p(:class="$style.sectionDesc") Add SMB or WebDAV sources to scan and browse your music library by connection.

dd.gap-top
  div(:class="$style.formCard")
    .gap-top(:class="$style.cardHeader")
      div
        p(:class="$style.eyebrow") {{ isEditing ? 'Editing source' : 'Create source' }}
        h3(:class="$style.cardTitle") {{ formTitle }}
      p(:class="$style.cardDesc") {{ formDesc }}

    .gap-top(:class="$style.field")
      label(:class="$style.label" for="media_library_name") Name
      base-input#media_library_name(:model-value="form.name" placeholder="My NAS Music" :disabled="isSaving" @update:model-value="updateField('name', $event)")
      p(v-if="errors.name" :class="$style.error") {{ errors.name }}

    template(v-if="form.type === 'webdav'")
      .gap-top(:class="$style.field")
        label(:class="$style.label" for="media_library_url") WebDAV URL
        base-input#media_library_url(:model-value="form.url" placeholder="https://example.com/dav" :disabled="isSaving" @update:model-value="updateField('url', $event)")
        p(:class="$style.helper") Full server address for your WebDAV endpoint.
        p(v-if="errors.url" :class="$style.error") {{ errors.url }}
      .gap-top(:class="$style.field")
        label(:class="$style.label" for="media_library_root_path_webdav") Root Path
        base-input#media_library_root_path_webdav(:model-value="form.rootPath" placeholder="/music" :disabled="isSaving" @update:model-value="updateField('rootPath', $event)")
        p(:class="$style.helper") Optional folder inside the WebDAV root. Use / to scan the whole connection.

    template(v-else)
      .gap-top(:class="$style.fieldRow")
        div(:class="$style.field")
          label(:class="$style.label" for="media_library_host") Host
          base-input#media_library_host(:model-value="form.host" placeholder="192.168.1.10" :disabled="isSaving" @update:model-value="updateField('host', $event)")
          p(v-if="errors.host" :class="$style.error") {{ errors.host }}
        div(:class="$style.field")
          label(:class="$style.label" for="media_library_port") Port
          base-input#media_library_port(:model-value="form.port ?? ''" placeholder="445" :disabled="isSaving" @update:model-value="updatePort($event)")
          p(v-if="errors.port" :class="$style.error") {{ errors.port }}
      .gap-top(:class="$style.field")
        label(:class="$style.label" for="media_library_share") Share Name
        base-input#media_library_share(:model-value="form.share" placeholder="Music" :disabled="isSaving" @update:model-value="updateField('share', $event)")
        p(:class="$style.helper") The SMB share name, not the full path.
        p(v-if="errors.share" :class="$style.error") {{ errors.share }}
      .gap-top(:class="$style.field")
        label(:class="$style.label" for="media_library_root_path_smb") Root Path
        base-input#media_library_root_path_smb(:model-value="form.rootPath" placeholder="/Albums" :disabled="isSaving" @update:model-value="updateField('rootPath', $event)")
        p(:class="$style.helper") Optional subfolder inside the share. Use / to scan the whole share.
      .gap-top(:class="$style.field")
        label(:class="$style.label" for="media_library_domain") Domain
        base-input#media_library_domain(:model-value="form.domain" placeholder="WORKGROUP" :disabled="isSaving" @update:model-value="updateField('domain', $event)")
        p(:class="$style.helper") Leave empty unless your SMB server requires a domain or workgroup.

    .gap-top(:class="$style.fieldRow")
      div(:class="$style.field")
        label(:class="$style.label" for="media_library_username") Username
        base-input#media_library_username(:model-value="form.username" placeholder="Username" :disabled="isSaving" @update:model-value="updateField('username', $event)")
      div(:class="$style.field")
        label(:class="$style.label" for="media_library_password") Password
        base-input#media_library_password(type="password" :model-value="form.password" placeholder="Password" :disabled="isSaving" @update:model-value="updateField('password', $event)")

    .gap-top(:class="$style.formActions")
      base-btn.btn(min :disabled="isSaving" @click="save") {{ isSaving ? 'Saving and scanning...' : actionLabel }}
      base-btn.btn.gap-left(min outline :disabled="isSaving" @click="cancel") {{ isEditing ? 'Cancel edit' : 'Reset' }}

dd.gap-top
  .gap-top(:class="$style.listHeader")
    div
      p(:class="$style.eyebrow") Connections
      h3(:class="$style.listTitle") Connected Sources
    p(:class="$style.listDesc") Scan each connection independently and review the latest import summary below.
  template(v-if="connections.length")
    .gap-top(v-for="item in connections" :key="item.id" :class="$style.connectionCard")
      div(:class="$style.connectionHeader")
        div
          h4(:class="$style.connectionName") {{ item.name }}
          p(:class="$style.connectionMeta") {{ item.type.toUpperCase() }}
        span(:class="[$style.statusBadge, $style[`status_${getStatusVariant(item)}`]]") {{ getStatusLabel(item) }}
      p(:class="$style.connectionPath") {{ getConnectionPath(item) }}
      p(:class="$style.connectionSummary") {{ item.lastScanSummary || 'No scan result yet' }}
      .gap-top(:class="$style.connectionActions")
        base-btn.btn(min :disabled="isSaving || isScanningId === item.id" @click="scan(item.id)") {{ isScanningId === item.id ? 'Scanning...' : 'Scan' }}
        base-btn.btn.gap-left(min outline :disabled="isSaving || isScanningId != ''" @click="editConnection(item)") Edit
        base-btn.btn.gap-left(min outline :disabled="isSaving || isScanningId === item.id || isRemovingId === item.id" @click="remove(item.id)") {{ isRemovingId === item.id ? 'Removing...' : 'Remove' }}
  template(v-else)
    .gap-top(:class="$style.emptyState")
      p(:class="$style.eyebrow") Empty state
      h4(:class="$style.emptyTitle") No media sources yet
      p(:class="$style.emptyDesc") Create an SMB or WebDAV connection first, then scan it to import your library.
</template>

<script>
import { computed, ref, onMounted } from '@common/utils/vueTools'
import { dialog } from '@renderer/plugins/Dialog'
import { getMediaConnections, saveMediaConnection, removeMediaConnection, scanMediaConnection } from '@renderer/utils/ipc'

const createForm = (type = 'smb') => ({
  id: '',
  type,
  name: '',
  url: '',
  host: '',
  port: undefined,
  share: '',
  rootPath: '/',
  domain: '',
  username: '',
  password: '',
  isEnabled: true,
})

export default {
  name: 'SettingMediaLibrary',
  setup() {
    const connections = ref([])
    const editingId = ref('')
    const form = ref(createForm())
    const errors = ref({})
    const isSaving = ref(false)
    const isRemovingId = ref('')
    const isScanningId = ref('')

    const isEditing = computed(() => !!editingId.value)
    const formTitle = computed(() => isEditing.value ? `Edit ${form.value.type.toUpperCase()} connection` : `Add ${form.value.type.toUpperCase()} connection`)
    const formDesc = computed(() => isEditing.value
      ? 'Update the connection details below. Saving will trigger a fresh scan.'
      : 'Fill in the connection details below. Saving will create the source and start scanning.',
    )
    const actionLabel = computed(() => isEditing.value ? 'Save and rescan' : 'Save and scan')

    const load = async() => {
      connections.value = (await getMediaConnections()).map(item => ({
        ...JSON.parse(item.config),
        id: item.id,
        type: item.type,
        name: item.name,
        lastScanStatus: item.lastScanStatus,
        lastScanSummary: item.lastScanSummary,
      }))
    }

    const resetErrors = () => {
      errors.value = {}
    }

    const updateField = (key, value) => {
      form.value[key] = value
      if (errors.value[key]) {
        errors.value = {
          ...errors.value,
          [key]: '',
        }
      }
    }

    const updatePort = (value) => {
      if (!value) {
        form.value.port = undefined
        if (errors.value.port) {
          errors.value = {
            ...errors.value,
            port: '',
          }
        }
        return
      }
      form.value.port = value
      if (errors.value.port) {
        errors.value = {
          ...errors.value,
          port: '',
        }
      }
    }

    const validateForm = () => {
      const nextErrors = {}
      if (!form.value.name) nextErrors.name = 'Name is required'
      if (form.value.type === 'webdav') {
        if (!form.value.url) nextErrors.url = 'WebDAV URL is required'
      } else {
        if (!form.value.host) nextErrors.host = 'Host is required'
        if (!form.value.share) nextErrors.share = 'Share name is required'
        if (form.value.port != null && form.value.port !== '' && !/^\d+$/.test(String(form.value.port))) {
          nextErrors.port = 'Port must be a number'
        }
      }
      errors.value = nextErrors
      return !Object.keys(nextErrors).length
    }

    const showCreate = (type) => {
      editingId.value = ''
      form.value = createForm(type)
      resetErrors()
    }

    const editConnection = (item) => {
      editingId.value = item.id
      form.value = { ...createForm(item.type), ...item }
      resetErrors()
    }

    const cancel = () => {
      editingId.value = ''
      form.value = createForm(form.value.type || 'smb')
      resetErrors()
    }

    const save = async() => {
      if (isSaving.value) return
      if (!validateForm()) return
      isSaving.value = true
      try {
        const payload = {
          ...form.value,
          port: form.value.port ? Number(form.value.port) : undefined,
          id: form.value.id || `${form.value.type}_${Date.now()}`,
        }
        await saveMediaConnection(payload)
        await load()
        cancel()
      } finally {
        isSaving.value = false
      }
    }

    const remove = async(id) => {
      const confirm = await dialog.confirm({
        message: 'Remove this media connection? Its scanned songs will also be removed from the Media Library.',
        confirmButtonText: 'Remove',
      })
      if (!confirm) return
      isRemovingId.value = id
      try {
        await removeMediaConnection(id)
        await load()
        if (editingId.value === id) cancel()
      } finally {
        isRemovingId.value = ''
      }
    }

    const scan = async(id) => {
      isScanningId.value = id
      try {
        await scanMediaConnection(id)
        await load()
      } finally {
        isScanningId.value = ''
      }
    }

    const getStatusVariant = (item) => {
      if (item.lastScanStatus === 'success') return 'success'
      if (item.lastScanStatus === 'error') return 'error'
      if (item.status === 'scanning' || item.lastScanStatus === 'scanning') return 'scanning'
      return 'idle'
    }

    const getStatusLabel = (item) => {
      const variant = getStatusVariant(item)
      if (variant === 'success') return 'Success'
      if (variant === 'error') return 'Error'
      if (variant === 'scanning') return 'Scanning'
      return 'Idle'
    }

    const getConnectionPath = (item) => {
      if (item.type === 'webdav') return `${item.url || '--'}${item.rootPath || '/'}`
      return `${item.host || '--'} / ${item.share || '--'}${item.rootPath || '/'}`
    }

    onMounted(() => {
      void load()
    })

    return {
      connections,
      editingId,
      form,
      errors,
      isEditing,
      isSaving,
      isRemovingId,
      isScanningId,
      formTitle,
      formDesc,
      actionLabel,
      showCreate,
      editConnection,
      cancel,
      save,
      remove,
      scan,
      updateField,
      updatePort,
      getStatusVariant,
      getStatusLabel,
      getConnectionPath,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.eyebrow {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  letter-spacing: .08em;
  text-transform: uppercase;
  opacity: .58;
}

.sectionIntro,
.formCard,
.connectionCard,
.emptyState {
  border-radius: 18px;
  background: color-mix(in srgb, var(--color-primary-background-hover) 88%, rgba(255, 255, 255, .08));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .07),
    0 12px 26px rgba(0, 0, 0, .05);
  border: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 56%, transparent);
}

.sectionIntro {
  padding: 18px;
}

.sectionHeader,
.listHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.sectionTitle,
.cardTitle,
.listTitle,
.emptyTitle {
  margin: 8px 0 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.35;
}

.sectionDesc,
.cardDesc,
.listDesc,
.emptyDesc,
.helper,
.connectionMeta,
.connectionSummary {
  margin-top: 8px;
  font-size: 12px;
  opacity: .74;
  line-height: 1.6;
}

.createActions,
.formActions,
.connectionActions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.formCard,
.connectionCard,
.emptyState {
  padding: 18px;
}

.cardHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 66%, transparent);
}

.cardDesc {
  max-width: 360px;
  margin-top: 0;
}

.field {
  display: flex;
  flex-direction: column;
}

.fieldRow {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.label {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
}

.helper {
  margin-top: 6px;
}

.error {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-danger, #e85454);
  line-height: 1.5;
}

.listHeader {
  margin-bottom: 2px;
}

.connectionHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.connectionName {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
}

.connectionMeta {
  letter-spacing: .06em;
  text-transform: uppercase;
}

.statusBadge {
  flex: none;
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .04em;
  border: 1px solid transparent;
  background: color-mix(in srgb, var(--color-button-background) 86%, transparent);
}

.status_success {
  color: #1f8f55;
  background: rgba(31, 143, 85, .12);
  border-color: rgba(31, 143, 85, .18);
}

.status_error {
  color: #cc4545;
  background: rgba(204, 69, 69, .12);
  border-color: rgba(204, 69, 69, .18);
}

.status_scanning {
  color: #b57a06;
  background: rgba(181, 122, 6, .14);
  border-color: rgba(181, 122, 6, .2);
}

.status_idle {
  color: color-mix(in srgb, var(--color-font) 82%, transparent);
  border-color: color-mix(in srgb, var(--color-list-header-border-bottom) 52%, transparent);
}

.connectionPath,
.connectionSummary {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-all;
}

.connectionPath {
  font-weight: 600;
  opacity: .88;
}

.connectionSummary {
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-primary-background) 70%, transparent);
}

@media (max-width: 720px) {
  .fieldRow {
    grid-template-columns: 1fr;
  }

  .cardHeader,
  .sectionHeader,
  .listHeader,
  .connectionHeader {
    flex-direction: column;
  }
}
</style>

