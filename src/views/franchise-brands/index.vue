<!-- 总后台：加盟品牌只读列表 -->
<template>
  <div class="page-shell">
    <div class="page-shell__header">
      <div>
        <h1 class="page-shell__title">加盟品牌</h1>
        <p class="page-shell__subtitle">查看平台加盟品牌及已上线门店数（只读，写操作后续单独接入）。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="loadList">刷新</el-button>
    </div>

    <el-alert
      v-if="loadError"
      :title="loadError"
      type="error"
      show-icon
      :closable="false"
      class="page-shell__alert"
    />

    <el-card class="page-shell__card">
      <el-table :data="list" v-loading="loading" border size="small" empty-text="暂无品牌数据">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="品牌名称" min-width="160" />
        <el-table-column label="图标" width="100">
          <template #default="{ row }">
            <el-image
              v-if="row.icon_url"
              :src="row.icon_url"
              fit="cover"
              style="width: 40px; height: 40px; border-radius: 4px"
            />
            <span v-else>--</span>
          </template>
        </el-table-column>
        <el-table-column prop="sort_order" label="排序" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_enabled ? 'success' : 'info'">
              {{ row.is_enabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="store_count" label="上线门店" width="100" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { fetchFranchiseBrands } from '../../api/franchise-brands'
import { getRequestErrorMessage } from '../../utils/http'

const loading = ref(false)
const loadError = ref('')
const list = ref([])

async function loadList() {
  loading.value = true
  loadError.value = ''

  try {
    const result = await fetchFranchiseBrands()
    list.value = Array.isArray(result?.list) ? result.list : []
  } catch (error) {
    loadError.value = getRequestErrorMessage(error, '品牌列表加载失败')
    list.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadList()
})
</script>
