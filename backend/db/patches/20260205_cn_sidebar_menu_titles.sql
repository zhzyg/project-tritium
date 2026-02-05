SET NAMES utf8mb4;

-- Sidebar core menus
UPDATE sys_permission SET name = '仪表盘'
  WHERE url = '/dashboard' OR name = 'Dashboard';

UPDATE sys_permission SET name = '应用运行'
  WHERE id = '9f1b2c3d4e5f60718293a4b5c6d7e8f8'
     OR url = '/form/runtime'
     OR name = 'App Runtime';

-- Runtime leaf menus (formKey-based) -> use generic Chinese label
UPDATE sys_permission SET name = '运行表单'
  WHERE parent_id = '9f1b2c3d4e5f60718293a4b5c6d7e8f8'
    AND url LIKE '/form/runtime/%/list'
    AND name REGEXP '[A-Za-z]';

-- Demo / component routes (based on URL/perms)
UPDATE sys_permission SET name = '图表文档（内嵌）'
  WHERE url = '/frame/antv' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '图表演示'
  WHERE url = '/report/chartDemo' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '图表'
  WHERE url = '/charts/echarts' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '表格导入导出'
  WHERE url = '/feat/excel' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '数组数据导出'
  WHERE url = '/feat/excel/arrayExport' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '结构化数据导出'
  WHERE url = '/feat/excel/jsonExport' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '按钮组件'
  WHERE url = '/comp/basic/button' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '外部点击组件'
  WHERE url = '/comp/third/click-out-side' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '加载组件'
  WHERE url = '/comp/third/loading' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '日历（新）'
  WHERE url = '/comp/third/fullCalendar' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '表单'
  WHERE url = '/comp/form' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '表单用法'
  WHERE url = '/comp/form/useForm' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '表单引用'
  WHERE url = '/comp/form/refForm' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '表格'
  WHERE url = '/comp/table' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '表格用法'
  WHERE url = '/comp/table/useTable' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '表格引用'
  WHERE url = '/comp/table/refTable' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '树'
  WHERE url = '/comp/tree' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '平台组件'
  WHERE url = '/comp/jeecg' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '可编辑表格示例'
  WHERE url = '/jeecg/j-vxe-table-demo' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '结构化数据编辑器'
  WHERE url = '/comp/editor/json' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '标记文本编辑器'
  WHERE url = '/comp/editor/markdown' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '标记文本编辑器'
  WHERE url = '/comp/editor/markdown/editor' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '富文本编辑器'
  WHERE url = '/comp/editor/tinymce/editor' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '标签页组件'
  WHERE url = '/comp/basic/tabs' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '标签详情页'
  WHERE url LIKE '/comp/basic/tabs/detail/%' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '菜单一'
  WHERE url = '/level/menu1' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '菜单一-1'
  WHERE url = '/level/menu1/menu1-1' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '菜单一-1-1'
  WHERE url = '/level/menu1/menu1-1/menu1-1-1' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '菜单一-2'
  WHERE url = '/level/menu1/menu1-2' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '菜单二'
  WHERE url = '/level/menu2' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '菜单带参'
  WHERE url LIKE '/feat/testParam/%' AND url NOT LIKE '%/sub1' AND url NOT LIKE '%/sub2'
    AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '菜单带参1'
  WHERE url LIKE '/feat/testParam/%/sub1' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '菜单带参2'
  WHERE url LIKE '/feat/testParam/%/sub2' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '标签页带参'
  WHERE url LIKE '/feat/testTab/%' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '标签页带参1'
  WHERE url = '/testTab/id1' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '标签页带参2'
  WHERE url = '/feat/testTab/id2' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '长连接测试'
  WHERE url = '/feat/ws' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '模拟示例'
  WHERE url = '/system' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '系统首页'
  WHERE url = '/' AND name REGEXP '[A-Za-z]';

-- Online engine auto routes
UPDATE sys_permission SET name = '在线表单'
  WHERE url = '/online/cgform' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '在线表单'
  WHERE url LIKE '/online/cgformList/%' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '企业资源表单'
  WHERE url LIKE '/online/cgformErpList/%' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '一对多表单'
  WHERE url LIKE '/online/cgformTabList/%' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '子表单'
  WHERE url LIKE '/online/cgformInnerTableList/%' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '在线树表单'
  WHERE url LIKE '/online/cgformTreeList/%' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '在线报表'
  WHERE url = '/online/cgreport' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '在线报表'
  WHERE url LIKE '/online/cgreport/%' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '复制表单'
  WHERE url LIKE '/online/copyform/%' AND name REGEXP '[A-Za-z]';

-- Monitor routes
UPDATE sys_permission SET name = '缓存监控'
  WHERE url = '/monitor/redis' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '数据库监控'
  WHERE url = '/monitor/druid' AND name REGEXP '[A-Za-z]';

-- ERP list
UPDATE sys_permission SET name = '企业资源列表'
  WHERE url = '/erplist' AND name REGEXP '[A-Za-z]';

-- Button permissions (menu_type=2)
UPDATE sys_permission SET name = '新增'
  WHERE perms = 'btn:add' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '解析语句'
  WHERE perms = 'online:report:parseSql' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '文件上传'
  WHERE perms = 'system:ossFile:upload' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '租户查询'
  WHERE perms = 'system:tenant:queryList' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '查询用户'
  WHERE perms = 'system:user:queryById' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '查询用户角色'
  WHERE perms = 'system:user:queryUserRole' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '按用户查询租户'
  WHERE perms = 'system:tenant:getTenantListByUserId' AND name REGEXP '[A-Za-z]';

UPDATE sys_permission SET name = '租户用户列表'
  WHERE perms = 'system:tenant:user:list' AND name REGEXP '[A-Za-z]';
