<!-- 这个页面是“总后台运营配置页”，只读展示服务区域与商家主营类目（公共接口 /common/*）。 -->
<template>
  <div class="page-shell">
    <div class="page-shell__header">
      <div>
        <h1 class="page-shell__title">运营配置</h1>
        <p class="page-shell__subtitle">只读查看服务区域与商家类目配置。在线编辑能力需后端 /admin/config 接口。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="loadAll">刷新</el-button>
    </div>

    <el-alert
      type="info"
      show-icon
      :closable="false"
      class="page-shell__alert"
      title="只读模式"
      :description="configSource === 'admin'
        ? '数据来自 GET /admin/config。写入能力需后端实现 PUT /admin/config。'
        : '后端 /admin/config 尚未就绪，当前读 /common/service-areas 与 /common/merchant-primary-categories。'"
    />

    <el-card class="page-shell__card">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="服务区域" name="areas">
          <div class="operations-toolbar">
            <el-radio-group v-model="areaType" @change="loadAreas">
              <el-radio-button value="">全部</el-radio-button>
              <el-radio-button value="county">县城</el-radio-button>
              <el-radio-button value="town">乡镇</el-radio-button>
            </el-radio-group>
          </div>
          <el-table :data="areas" v-loading="loading" border empty-text="暂无区域数据">
            <el-table-column prop="area_code" label="区域编码" min-width="140" />
            <el-table-column prop="area_name" label="区域名称" min-width="160" />
            <el-table-column label="类型" width="100">
              <template #default="{ row }">{{ row.area_type === 'town' ? '乡镇' : '县城' }}</template>
            </el-table-column>
            <el-table-column prop="parent_code" label="上级编码" min-width="120" />
            <el-table-column prop="sort_order" label="排序" width="80" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="商家主营类目" name="categories">
          <el-table :data="categories" v-loading="loading" border empty-text="暂无类目数据">
            <el-table-column type="index" label="#" width="60" />
            <el-table-column prop="label" label="类目名称" min-width="200">
              <template #default="{ row }">{{ row.label || row.name || row }}</template>
            </el-table-column>
            <el-table-column prop="value" label="类目值" min-width="160">
              <template #default="{ row }">{{ row.value || row.code || '--' }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
// 这个文件是“总后台运营配置页”逻辑，只读拉取公共配置接口。
import { onMounted, ref } from 'vue'
import { fetchAdminConfig, isAdminConfigApiUnavailable } from '../../api/config'
import { fetchMerchantPrimaryCategories, fetchServiceAreas } from '../../api/common'
import { getRequestErrorMessage } from '../../utils/http'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const activeTab = ref('areas')
const areaType = ref('')
const areas = ref([])
const categories = ref([])
const configSource = ref('common')

function normalizeCategories(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.list)) return payload.list
  return []
}

async function loadAreas() {
  loading.value = true
  try {
    const result = await fetchServiceAreas({
      area_type: areaType.value || undefined,
      enabled: true,
    })
    areas.value = Array.isArray(result) ? result : []
  } catch (error) {
    ElMessage.error(getRequestErrorMessage(error, '服务区域加载失败'))
    areas.value = []
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const result = await fetchMerchantPrimaryCategories()
    categories.value = normalizeCategories(result)
  } catch (error) {
    ElMessage.error(getRequestErrorMessage(error, '商家类目加载失败'))
    categories.value = []
  }
}

async function loadAll() {
  loading.value = true

  try {
    const config = await fetchAdminConfig()
    areas.value = Array.isArray(config?.service_areas) ? config.service_areas : []
    categories.value = normalizeCategories(config?.merchant_primary_categories)
    configSource.value = 'admin'
  } catch (error) {
    if (isAdminConfigApiUnavailable(error)) {
      configSource.value = 'common'
      await Promise.all([loadAreas(), loadCategories()])
    } else {
      ElMessage.error(getRequestErrorMessage(error, '运营配置加载失败'))
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAll()
})
</script>

<style scoped>
.operations-toolbar {
  margin-bottom: 16px;
}
</style>
