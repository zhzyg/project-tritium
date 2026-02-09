package org.jeecg.modules.system.controller;

import com.alibaba.fastjson.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.apache.shiro.SecurityUtils;
import org.jeecg.common.api.vo.Result;
import org.jeecg.common.system.vo.LoginUser;
import org.jeecg.modules.system.entity.TrMenuLayout;
import org.jeecg.modules.system.service.IMenuLayoutService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * @Description: 菜单布局 Controller
 * @Author: tritium-agent
 * @Date:   2026-02-06
 */
@Slf4j
@Api(tags="菜单布局")
@RestController
@RequestMapping("/sys/menuLayout")
public class MenuLayoutController {

    @Autowired
    private IMenuLayoutService menuLayoutService;

    @ApiOperation(value="获取当前用户菜单布局", notes="获取当前用户菜单布局")
    @GetMapping(value = "/getMine")
    public Result<?> getMine() {
        LoginUser sysUser = (LoginUser) SecurityUtils.getSubject().getPrincipal();
        TrMenuLayout layout = menuLayoutService.getByUserId(sysUser.getId());
        if (layout == null) {
            return Result.OK(new JSONObject());
        }
        return Result.OK(JSONObject.parseObject(layout.getLayoutJson()));
    }

    @ApiOperation(value="保存当前用户菜单布局", notes="保存当前用户菜单布局")
    @PostMapping(value = "/saveMine")
    public Result<?> saveMine(@RequestBody JSONObject layoutJson) {
        LoginUser sysUser = (LoginUser) SecurityUtils.getSubject().getPrincipal();
        TrMenuLayout layout = menuLayoutService.getByUserId(sysUser.getId());
        if (layout == null) {
            layout = new TrMenuLayout();
            layout.setUserId(sysUser.getId());
        }
        layout.setLayoutJson(layoutJson.toJSONString());
        menuLayoutService.saveOrUpdate(layout);
        return Result.OK("保存成功");
    }

    @ApiOperation(value="重置菜单布局", notes="重置菜单布局")
    @PostMapping(value = "/resetMine")
    public Result<?> resetMine() {
        LoginUser sysUser = (LoginUser) SecurityUtils.getSubject().getPrincipal();
        menuLayoutService.remove(new LambdaQueryWrapper<TrMenuLayout>().eq(TrMenuLayout::getUserId, sysUser.getId()));
        return Result.OK("重置成功");
    }
}
