<template lang="pug">
dt#media_library 媒体库

dd
  .gap-top(:class="$style.sectionIntro")
    .gap-top(:class="$style.sectionHeader")
      div
        p(:class="$style.eyebrow") Media Library
        p(:class="$style.sectionTitle") 管理媒体来源
        p(:class="$style.sectionDesc") 添加本地文件夹、SMB 或 WebDAV 来源，扫描后可按连接浏览媒体库。

    .gap-top(:class="$style.sourcePicker")
      button(
        v-for="option in sourceOptions"
        :key="option.type"
        type="button"
        :class="[$style.sourceCard, form.type === option.type ? $style.sourceCardActive : '', option.recommended ? $style.sourceCardRecommended : '']"
        :disabled="isSaving || isScanningId != ''"
        @click="showCreate(option.type)"
      )
        div(:class="$style.sourceCardTop")
          span(:class="$style.sourceCardIcon" aria-hidden="true") {{ option.icon }}
          div(:class="$style.sourceCardBadges")
            span(v-if="option.recommended" :class="$style.sourceBadge") 推荐
            span(v-if="form.type === option.type" :class="$style.sourceBadgeSelected") 已选择
        p(:class="$style.sourceCardTitle") {{ option.label }}
        p(:class="$style.sourceCardDesc") {{ option.desc }}
        p(:class="$style.sourceCardScene") 适用场景：{{ option.scene }}
        p(v-if="form.type === option.type" :class="$style.sourceCardActionHint") {{ option.actionHint }}

  .gap-top(:class="$style.typeGuide")
    p(:class="$style.typeGuideTitle") 当前正在配置：{{ currentTypeLabel }}
    p(:class="$style.typeGuideDesc") {{ currentTypeDesc }}

dd.gap-top
  div(:class="$style.formCard")
    .gap-top(:class="$style.cardHeader")
      div
        p(:class="$style.eyebrow") {{ isEditing ? '编辑来源' : '新建来源' }}
        h3(:class="$style.cardTitle") {{ formTitle }}
      p(:class="$style.cardDesc") {{ formDesc }}

    .gap-top(:class="$style.field")
      label(:class="$style.label" for="media_library_name") 名称
      base-input#media_library_name(:model-value="form.name" placeholder="例如：家里音乐库" :disabled="isSaving" @update:model-value="updateField('name', $event)")
      p(v-if="errors.name" :class="$style.error") {{ errors.name }}

    template(v-if="form.type === 'local'")
      .gap-top(:class="$style.field")
        label(:class="$style.label" for="media_library_local_path") 文件夹路径
        .gap-top(:class="$style.pathField")
          base-input#media_library_local_path(:model-value="form.localPath" placeholder="D:\\Music" :disabled="isSaving" @update:model-value="updateField('localPath', $event)")
          base-btn.btn.gap-left(min outline :disabled="isSaving" @click="pickLocalFolder") 浏览
        p(:class="$style.helper") 选择一个本地音乐文件夹。扫描时会递归读取其所有子文件夹中的支持音频文件。
        p(v-if="localPathHint" :class="[$style.helper, $style.pathHint]") {{ localPathHint }}
        p(v-if="errors.localPath" :class="$style.error") {{ errors.localPath }}

    template(v-else-if="form.type === 'webdav'")
      .gap-top(:class="$style.field")
        label(:class="$style.label" for="media_library_url") WebDAV 地址
        base-input#media_library_url(:model-value="form.url" placeholder="https://example.com/dav" :disabled="isSaving" @update:model-value="updateField('url', $event)")
        p(:class="$style.helper") 填写完整的 WebDAV 服务地址。
        p(v-if="errors.url" :class="$style.error") {{ errors.url }}
      .gap-top(:class="$style.field")
        label(:class="$style.label" for="media_library_root_path_webdav") 根路径
        base-input#media_library_root_path_webdav(:model-value="form.rootPath" placeholder="/music" :disabled="isSaving" @update:model-value="updateField('rootPath', $event)")
        p(:class="$style.helper") 可选。填写 WebDAV 下的子目录；使用 / 表示扫描整个连接。

    template(v-else)
      .gap-top(:class="$style.fieldRow")
        div(:class="$style.field")
          label(:class="$style.label" for="media_library_host") 主机
          base-input#media_library_host(:model-value="form.host" placeholder="192.168.1.10" :disabled="isSaving" @update:model-value="updateField('host', $event)")
          p(v-if="errors.host" :class="$style.error") {{ errors.host }}
        div(:class="$style.field")
          label(:class="$style.label" for="media_library_port") 端口
          base-input#media_library_port(:model-value="form.port ?? ''" placeholder="445" :disabled="isSaving" @update:model-value="updatePort($event)")
          p(v-if="errors.port" :class="$style.error") {{ errors.port }}
      .gap-top(:class="$style.field")
        label(:class="$style.label" for="media_library_share") 共享名
        base-input#media_library_share(:model-value="form.share" placeholder="Music" :disabled="isSaving" @update:model-value="updateField('share', $event)")
        p(:class="$style.helper") 这里填写 SMB 的共享名称，不是完整路径。
        p(v-if="errors.share" :class="$style.error") {{ errors.share }}
      .gap-top(:class="$style.field")
        label(:class="$style.label" for="media_library_root_path_smb") 根路径
        base-input#media_library_root_path_smb(:model-value="form.rootPath" placeholder="/Albums" :disabled="isSaving" @update:model-value="updateField('rootPath', $event)")
        p(:class="$style.helper") 可选。填写共享目录中的子路径；使用 / 表示扫描整个共享。
      .gap-top(:class="$style.field")
        label(:class="$style.label" for="media_library_domain") 域 / 工作组
        base-input#media_library_domain(:model-value="form.domain" placeholder="WORKGROUP" :disabled="isSaving" @update:model-value="updateField('domain', $event)")
        p(:class="$style.helper") 如果服务器不要求域或工作组，可留空。

    template(v-if="form.type !== 'local'")
      .gap-top(:class="$style.fieldRow")
        div(:class="$style.field")
          label(:class="$style.label" for="media_library_username") 用户名
          base-input#media_library_username(:model-value="form.username" placeholder="用户名" :disabled="isSaving" @update:model-value="updateField('username', $event)")
        div(:class="$style.field")
          label(:class="$style.label" for="media_library_password") 密码
          base-input#media_library_password(type="password" :model-value="form.password" placeholder="密码" :disabled="isSaving" @update:model-value="updateField('password', $event)")

    .gap-top(:class="$style.formActions")
      base-btn.btn(min :disabled="isSaving" @click="save") {{ isSaving ? '正在保存并扫描...' : actionLabel }}
      base-btn.btn.gap-left(min outline :disabled="isSaving" @click="cancel") {{ isEditing ? '取消编辑' : '重置' }}

dd.gap-top
  .gap-top(:class="$style.listHeader")
    div
      p(:class="$style.eyebrow") 连接列表
      h3(:class="$style.listTitle") 已连接的来源
    p(:class="$style.listDesc") 每个连接都可以单独扫描，下方会显示最近一次扫描结果。
  template(v-if="connections.length")
    .gap-top(v-for="item in connections" :key="item.id" :class="$style.connectionCard")
      div(:class="$style.connectionHeader")
        div
          h4(:class="$style.connectionName") {{ item.name }}
          p(:class="$style.connectionMeta") {{ item.type.toUpperCase() }}
        span(:class="[$style.statusBadge, $style[`status_${getStatusVariant(item)}`]]") {{ getStatusLabel(item) }}
      p(:class="$style.connectionPath") {{ getConnectionPath(item) }}
      p(:class="$style.connectionSummary") {{ item.lastScanSummary || '暂时还没有扫描结果' }}
      .gap-top(:class="$style.connectionActions")
        base-btn.btn(min :disabled="isSaving || isScanningId === item.id" @click="scan(item.id)") {{ isScanningId === item.id ? '扫描中...' : '扫描' }}
        base-btn.btn.gap-left(min outline :disabled="isSaving || isScanningId != ''" @click="editConnection(item)") 编辑
        base-btn.btn.gap-left(min outline :disabled="isSaving || isScanningId === item.id || isRemovingId === item.id" @click="remove(item.id)") {{ isRemovingId === item.id ? '删除中...' : '删除' }}
  template(v-else)
    .gap-top(:class="$style.emptyState")
      p(:class="$style.eyebrow") 空状态
      h4(:class="$style.emptyTitle") 还没有媒体来源
      p(:class="$style.emptyDesc") 先创建本地文件夹、SMB 或 WebDAV 连接，再扫描导入你的媒体库。
</template>

<script>
import { computed, ref, onMounted } from '@common/utils/vueTools'
import { dialog } from '@renderer/plugins/Dialog'
import { getMediaConnections, saveMediaConnection, removeMediaConnection, scanMediaConnection, showSelectDialog } from '@renderer/utils/ipc'

const createForm = (type = 'local') => ({
  id: '',
  type,
  name: '',
  url: '',
  localPath: '',
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

    const sourceOptions = [
      {
        type: 'local',
        label: '本地文件夹',
        icon: 'L',
        desc: '适合当前电脑上的音乐目录，配置最简单。',
        scene: '本机音乐文件夹、外接硬盘、已挂载磁盘',
        actionHint: '已切换到本地文件夹表单，可直接选择路径开始导入。',
        recommended: true,
      },
      {
        type: 'smb',
        label: 'SMB 共享',
        icon: 'S',
        desc: '适合局域网共享文件夹或 NAS 的共享目录。',
        scene: 'Windows 共享、路由器挂盘、NAS 局域网访问',
        actionHint: '已切换到 SMB 表单，请填写主机、共享名和认证信息。',
        recommended: false,
      },
      {
        type: 'webdav',
        label: 'WebDAV',
        icon: 'W',
        desc: '适合支持 WebDAV 的 NAS、网盘或远程存储。',
        scene: '支持 WebDAV 的远程目录、跨网络访问',
        actionHint: '已切换到 WebDAV 表单，请填写服务地址与根路径。',
        recommended: false,
      },
    ]

    const isEditing = computed(() => !!editingId.value)
    const currentTypeLabel = computed(() => {
      if (form.value.type === 'local') return '本地文件夹'
      if (form.value.type === 'webdav') return 'WebDAV 连接'
      return 'SMB 连接'
    })
    const currentTypeDesc = computed(() => {
      if (form.value.type === 'local') return '适合扫描当前电脑或本机挂载盘中的音乐目录，最适合大多数本地音乐场景。'
      if (form.value.type === 'webdav') return '适合 NAS、网盘或其他支持 WebDAV 的远程目录，需要填写服务地址。'
      return '适合局域网共享文件夹，需要填写主机、共享名以及可选认证信息。'
    })
    const formTitle = computed(() => {
      if (form.value.type === 'local') return isEditing.value ? '编辑本地文件夹' : '添加本地文件夹'
      return isEditing.value ? `编辑${form.value.type.toUpperCase()}连接` : `添加${form.value.type.toUpperCase()}连接`
    })
    const formDesc = computed(() => {
      if (form.value.type === 'local') {
        return isEditing.value
          ? '修改下面的本地文件夹路径，保存后会重新扫描。'
          : '选择一个本地文件夹并导入到媒体库中。'
      }
      return isEditing.value
        ? '修改下面的连接信息，保存后会重新扫描。'
        : '填写下面的连接信息，保存后会立即创建并开始扫描。'
    })
    const actionLabel = computed(() => isEditing.value ? '保存并重新扫描' : '保存并扫描')
    const localPathHint = computed(() => {
      if (form.value.type !== 'local') return ''
      const value = (form.value.localPath || '').trim()
      if (!value) return '支持 Windows 路径，例如 D:\\Music；也支持 UNC 路径，例如 \\\\NAS\\Music。拿不准时可直接点击“浏览”。'
      if (/^[A-Za-z]:$/.test(value)) return '盘符后还需要补充文件夹，例如 D:\\Music。'
      if (/^[A-Za-z]:[^\\/]/.test(value)) return 'Windows 盘符后建议补上斜杠，例如 D:\\Music。'
      if (/^\\\\[^\\]+$/.test(value)) return 'UNC 路径还需要包含共享目录，例如 \\\\NAS\\Music。'
      if (/["<>|?*]/.test(value)) return '这个路径中包含 Windows 文件夹通常不能使用的字符。'
      if (/\/$/.test(value) && !/^[A-Za-z]:\/$/.test(value)) return '末尾斜杠可以保留，但通常去掉会更整洁。'
      return '路径格式看起来没问题，保存后会递归扫描该文件夹及其子目录。'
    })

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

    const pickLocalFolder = async() => {
      const result = await showSelectDialog({
        title: '选择媒体文件夹',
        properties: ['openDirectory'],
      })
      if (result.canceled || !result.filePaths?.length) return
      updateField('localPath', result.filePaths[0])
      if (!form.value.name) {
        const selectedPath = result.filePaths[0]
        updateField('name', selectedPath.split(/[/\\]/).pop() ?? '本地音乐')
      }
    }

    const validateForm = () => {
      const nextErrors = {}
      if (!form.value.name) nextErrors.name = '请输入名称'
      if (form.value.type === 'local') {
        if (!form.value.localPath) nextErrors.localPath = '请输入文件夹路径'
      } else if (form.value.type === 'webdav') {
        if (!form.value.url) nextErrors.url = '请输入 WebDAV 地址'
      } else {
        if (!form.value.host) nextErrors.host = '请输入主机地址'
        if (!form.value.share) nextErrors.share = '请输入共享名'
        if (form.value.port != null && form.value.port !== '' && !/^\d+$/.test(String(form.value.port))) {
          nextErrors.port = '端口必须是数字'
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
      form.value = createForm(form.value.type || 'local')
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
          rootPath: form.value.type === 'local' ? undefined : form.value.rootPath,
          host: form.value.type === 'smb' ? form.value.host : undefined,
          share: form.value.type === 'smb' ? form.value.share : undefined,
          url: form.value.type === 'webdav' ? form.value.url : undefined,
          localPath: form.value.type === 'local' ? form.value.localPath : undefined,
          username: form.value.type === 'local' ? undefined : form.value.username,
          password: form.value.type === 'local' ? undefined : form.value.password,
          domain: form.value.type === 'smb' ? form.value.domain : undefined,
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
        message: '确定要删除这个媒体连接吗？该连接已扫描的歌曲也会从媒体库中移除。',
        confirmButtonText: '删除',
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
      if (variant === 'success') return '成功'
      if (variant === 'error') return '失败'
      if (variant === 'scanning') return '扫描中'
      return '空闲'
    }

    const getConnectionPath = (item) => {
      if (item.type === 'local') return item.localPath || '--'
      if (item.type === 'webdav') return `${item.url || '--'}${item.rootPath || '/'}`
      return `${item.host || '--'} / ${item.share || '--'}${item.rootPath || '/'}`
    }

    onMounted(() => {
      void load()
    })

    return {
      sourceOptions,
      connections,
      editingId,
      form,
      errors,
      isEditing,
      isSaving,
      isRemovingId,
      isScanningId,
      currentTypeLabel,
      currentTypeDesc,
      formTitle,
      formDesc,
      actionLabel,
      localPathHint,
      showCreate,
      editConnection,
      cancel,
      save,
      remove,
      scan,
      updateField,
      updatePort,
      pickLocalFolder,
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
.emptyState,
.typeGuide {
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

.sectionHeader {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.typeGuide {
  padding: 14px 18px;
}

.typeGuideTitle {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}

.typeGuideDesc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  opacity: .76;
}

.sourcePicker {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.sourceCard {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 170px;
  padding: 16px 16px 18px;
  border: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 56%, transparent);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, .05), rgba(255, 255, 255, 0) 56%),
    color-mix(in srgb, var(--color-primary-background-hover) 78%, rgba(255, 255, 255, .06));
  text-align: left;
  cursor: pointer;
  transition: background-color .2s ease, border-color .2s ease, transform .2s ease, box-shadow .2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
    box-shadow: 0 14px 24px rgba(0, 0, 0, .06);
  }
}

.sourceCardTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sourceCardBadges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sourceCardIcon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: color-mix(in srgb, var(--color-primary) 80%, rgba(255, 255, 255, .1));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .18);
}

.sourceBadge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 14%, rgba(255, 255, 255, .7));
  border: 1px solid color-mix(in srgb, var(--color-primary) 28%, transparent);
}

.sourceBadgeSelected {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  background: color-mix(in srgb, var(--color-primary) 88%, rgba(255, 255, 255, .12));
  border: 1px solid color-mix(in srgb, var(--color-primary) 62%, transparent);
}

.sourceCardActive {
  border-color: color-mix(in srgb, var(--color-primary) 72%, transparent);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 18%, rgba(255, 255, 255, .08)), rgba(255, 255, 255, 0) 62%),
    color-mix(in srgb, var(--color-primary) 16%, var(--color-primary-background-hover));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .08),
    0 12px 24px rgba(0, 0, 0, .06);
}

.sourceCardTitle {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
}

.sourceCardDesc {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  opacity: .8;
}

.sourceCardScene {
  margin-top: auto;
  margin-bottom: 0;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 52%, transparent);
  font-size: 12px;
  line-height: 1.6;
  opacity: .72;
}
.sourceCardActionHint {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: color-mix(in srgb, var(--color-primary) 86%, var(--color-font));
  background: color-mix(in srgb, var(--color-primary) 12%, rgba(255, 255, 255, .42));
  border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
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

.cardHeader,
.listHeader,
.connectionHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.cardHeader {
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

.pathField {
  display: flex;
  align-items: center;
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

.pathHint {
  color: color-mix(in srgb, var(--color-primary) 68%, var(--color-font));
}

.listHeader {
  margin-bottom: 2px;
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
  .sourcePicker {
    grid-template-columns: 1fr;
  }

  .fieldRow {
    grid-template-columns: 1fr;
  }

  .pathField {
    flex-direction: column;
    align-items: stretch;
  }

  .cardHeader,
  .listHeader,
  .connectionHeader {
    flex-direction: column;
  }
}
</style>
