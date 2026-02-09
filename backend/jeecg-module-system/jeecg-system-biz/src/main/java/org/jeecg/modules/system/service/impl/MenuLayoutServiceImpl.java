package org.jeecg.modules.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.jeecg.modules.system.entity.TrMenuLayout;
import org.jeecg.modules.system.mapper.MenuLayoutMapper;
import org.jeecg.modules.system.service.IMenuLayoutService;
import org.springframework.stereotype.Service;

/**
 * @Description: 菜单布局 Service 实现类
 * @Author: tritium-agent
 * @Date:   2026-02-06
 */
@Service
public class MenuLayoutServiceImpl extends ServiceImpl<MenuLayoutMapper, TrMenuLayout> implements IMenuLayoutService {

    @Override
    public TrMenuLayout getByUserId(String userId) {
        return this.getOne(new LambdaQueryWrapper<TrMenuLayout>().eq(TrMenuLayout::getUserId, userId));
    }
}
