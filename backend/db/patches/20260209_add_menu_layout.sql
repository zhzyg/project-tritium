CREATE TABLE `tr_menu_layout` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(100) NOT NULL COMMENT '用户ID (username)',
  `layout_json` text COMMENT '一级菜单顺序数组JSON',
  `create_by` varchar(50) DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_by` varchar(50) DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tml_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户侧边栏布局持久化';
