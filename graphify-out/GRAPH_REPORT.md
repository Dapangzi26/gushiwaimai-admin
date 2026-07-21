# Graph Report - E:\固始县外卖总后台管理端  (2026-07-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 540 nodes · 997 edges · 27 communities (25 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5e0d1171`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- admin-reminder-center.js
- index.vue
- unwrapPayload
- index.vue
- index.vue
- index.vue
- getRequestErrorMessage
- index.vue
- dependencies
- index.vue
- index.vue
- index.vue
- AppHeader.vue
- auth.js
- loadOrders
- refreshAfterAudit
- replaceCurrentRouteQuery
- index.js
- index.vue
- auth.js
- index.vue
- useAuthStore
- syncStateFromRoute
- loadOrderDetail
- formatDetailValue
- getRefundRowClassName

## God Nodes (most connected - your core abstractions)
1. `unwrapPayload()` - 49 edges
2. `getRequestErrorMessage()` - 36 edges
3. `unlockAudioPlayback()` - 16 edges
4. `loadNotifications()` - 13 edges
5. `fetchAdminOrders()` - 10 edges
6. `fetchAdminRiders()` - 10 edges
7. `request` - 10 edges
8. `replaceCurrentRouteQuery()` - 10 edges
9. `fetchRiderDetail()` - 9 edges
10. `getAudioStatus()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `handleViewDetail()` --calls--> `fetchRiderDetail()`  [EXTRACTED]
  src/views/town-stations/index.vue → src/api/riders.js
- `handleLogin()` --calls--> `unlockAudioPlayback()`  [EXTRACTED]
  src/views/login/index.vue → src/utils/admin-reminder-center.js
- `adminLogin()` --calls--> `unwrapPayload()`  [EXTRACTED]
  src/api/auth.js → src/api/helpers.js
- `fetchCurrentAdmin()` --calls--> `unwrapPayload()`  [EXTRACTED]
  src/api/auth.js → src/api/helpers.js
- `fetchDispatchTicket()` --calls--> `unwrapPayload()`  [EXTRACTED]
  src/api/auth.js → src/api/helpers.js

## Import Cycles
- None detected.

## Communities (27 total, 2 thin omitted)

### Community 0 - "admin-reminder-center.js"
Cohesion: 0.07
Nodes (43): activeMenu, defaultOpeneds, menuItems, route, audioUnlocked, handleUnlockAudio(), router, unlockingAudio (+35 more)

### Community 1 - "index.vue"
Cohesion: 0.06
Nodes (41): fetchAdminOrderDetail(), approveMerchantWithdrawal(), approveRiderWithdrawal(), fetchMerchantWithdrawals(), fetchPendingWithdrawCount(), fetchRiderWithdrawals(), rejectMerchantWithdrawal(), rejectRiderWithdrawal() (+33 more)

### Community 2 - "unwrapPayload"
Cohesion: 0.11
Nodes (31): fetchDashboardOverview(), fetchDashboardPendingCounts(), unwrapPayload(), approveMerchant(), fetchAdminMerchantDetail(), fetchAdminMerchants(), rejectMerchant(), fetchAdminRefunds() (+23 more)

### Community 3 - "index.vue"
Cohesion: 0.07
Nodes (40): createNotification(), deleteNotification(), fetchNotifications(), offlineNotification(), publishNotification(), toggleNotificationPin(), updateNotification(), actionLoadingId (+32 more)

### Community 4 - "index.vue"
Cohesion: 0.05
Nodes (29): activeTab, auditLoading, BUSINESS_OPTIONS, DETAIL_LABEL_MAP, detailData, detailError, detailLoading, detailSections (+21 more)

### Community 5 - "index.vue"
Cohesion: 0.08
Nodes (38): actionLoading, activeTab, BACKEND_ORIGIN, buildAssetUrl(), createDetailEntry(), currentColumns, currentState, DETAIL_FIELD_ORDER (+30 more)

### Community 6 - "getRequestErrorMessage"
Cohesion: 0.08
Nodes (29): fetchMerchantPrimaryCategories(), fetchServiceAreas(), fetchAdminOrders(), getRequestErrorMessage(), loadError, loading, loadLogs(), logList (+21 more)

### Community 7 - "index.vue"
Cohesion: 0.09
Nodes (28): actionLoading, activeRole, buildRouteQuery(), detailData, detailError, detailLoading, detailTitle, detailVisible (+20 more)

### Community 8 - "dependencies"
Cohesion: 0.07
Nodes (28): axios, element-plus, @element-plus/icons-vue, dependencies, axios, element-plus, @element-plus/icons-vue, pinia (+20 more)

### Community 9 - "index.vue"
Cohesion: 0.09
Nodes (21): actionLoading, detailData, detailError, detailLoading, detailTitle, detailVisible, handlePageChange(), handleStatusChange() (+13 more)

### Community 10 - "index.vue"
Cohesion: 0.11
Nodes (20): fetchFeedbackDetail(), fetchFeedbackList(), updateFeedbackStatus(), currentItem, currentStatus, detailError, detailLoading, detailVisible (+12 more)

### Community 11 - "index.vue"
Cohesion: 0.13
Nodes (20): allRiders, applyFilter(), detailData, detailLoading, detailVisible, fetchAllRiderPages(), getTownRiderCount(), goRiders() (+12 more)

### Community 12 - "AppHeader.vue"
Cohesion: 0.15
Nodes (12): adminName, authStore, breadcrumbItems, currentTitle, emit, handleUnlockAudio(), props, roleName (+4 more)

### Community 13 - "auth.js"
Cohesion: 0.31
Nodes (7): clearStoredAuth(), createEmptyAuth(), getStoredAuth(), setStoredAuth(), connectAdminSocket(), disconnectAdminSocket(), resolveSocketBaseUrl()

### Community 14 - "loadOrders"
Cohesion: 0.22
Nodes (10): buildCurrentRouteQuery(), getOrderQueryParams(), getRefundQueryParams(), loadOrders(), loadRefunds(), normalizeOrderRecord(), normalizeRefundRecord(), parseTimeRange() (+2 more)

### Community 15 - "refreshAfterAudit"
Cohesion: 0.28
Nodes (9): auditAdminOrderCancel(), auditAdminRefund(), canAdminArbitrateRefund(), handleApproveCancel(), handleApproveRefund(), handleRejectCancel(), handleRejectRefund(), refreshAfterAudit() (+1 more)

### Community 16 - "replaceCurrentRouteQuery"
Cohesion: 0.22
Nodes (9): createDefaultOrderFilters(), createDefaultRefundFilters(), handleCurrentChange(), handleReset(), handleSearch(), handleSizeChange(), handleTabChange(), normalizeQueryObject() (+1 more)

### Community 17 - "index.js"
Cohesion: 0.39
Nodes (3): router, routes, pinia

### Community 18 - "index.vue"
Cohesion: 0.25
Nodes (7): authStore, form, formRef, handleLogin(), router, rules, submitting

### Community 19 - "auth.js"
Cohesion: 0.53
Nodes (4): adminLogin(), adminLogout(), fetchCurrentAdmin(), persistedAuth

### Community 20 - "index.vue"
Cohesion: 0.47
Nodes (5): fetchDispatchTicket(), buildDispatchUrl(), errorMessage, loading, redirectToDispatchMap()

### Community 21 - "useAuthStore"
Cohesion: 0.40
Nodes (4): useAuthStore, adminRows, authStore, plannedRoles

### Community 22 - "syncStateFromRoute"
Cohesion: 0.67
Nodes (3): getQueryString(), syncStateFromRoute(), toPositiveNumber()

### Community 23 - "loadOrderDetail"
Cohesion: 0.67
Nodes (3): handleViewOrder(), handleViewRefund(), loadOrderDetail()

## Knowledge Gaps
- **210 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+205 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `unwrapPayload()` connect `unwrapPayload` to `index.vue`, `index.vue`, `getRequestErrorMessage`, `index.vue`, `refreshAfterAudit`, `auth.js`, `index.vue`?**
  _High betweenness centrality (0.261) - this node is a cross-community bridge._
- **Why does `getRequestErrorMessage()` connect `getRequestErrorMessage` to `index.vue`, `unwrapPayload`, `index.vue`, `index.vue`, `index.vue`, `index.vue`, `index.vue`, `index.vue`, `loadOrders`, `loadOrderDetail`?**
  _High betweenness centrality (0.237) - this node is a cross-community bridge._
- **Why does `getStoredAuth()` connect `auth.js` to `unwrapPayload`, `auth.js`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _210 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `admin-reminder-center.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07390648567119155 - nodes in this community are weakly interconnected._
- **Should `index.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.05939716312056738 - nodes in this community are weakly interconnected._
- **Should `unwrapPayload` be split into smaller, more focused modules?**
  _Cohesion score 0.11400966183574879 - nodes in this community are weakly interconnected._