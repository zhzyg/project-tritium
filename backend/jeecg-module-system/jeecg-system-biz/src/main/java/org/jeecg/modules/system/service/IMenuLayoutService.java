package org.jeecg.modules.system.service;

import com.baomidou.mybatisplus.extension.service.IService;
import org.jeecg.modules.system.entity.TrMenuLayout;

/**
 * @Description: 菜单布局 Service
 * @Author: tritium-agent
 * @Date:   2026-02-06
 */
public interface IMenuLayoutService extends IService<TrMenuLayout> {
    TrMenuLayout getByUserId(String userId);
}
