package org.jeecg.modules.flowable.controller;

import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.ManagementService;
import org.flowable.engine.RepositoryService;
import org.flowable.engine.RuntimeService;
import org.jeecg.common.api.vo.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/flowable")
public class FlowableHealthController {

    @Autowired(required = false)
    private RepositoryService repositoryService;

    @Autowired(required = false)
    private RuntimeService runtimeService;

    @Autowired(required = false)
    private ManagementService managementService;

    @GetMapping("/ping")
    public Result<?> ping() {
        if (repositoryService == null || runtimeService == null || managementService == null) {
            return Result.error("Flowable engine not initialized");
        }
        Map<String, Object> payload = new HashMap<>();
        payload.put("deployments", repositoryService.createDeploymentQuery().count());
        payload.put("processDefinitions", repositoryService.createProcessDefinitionQuery().count());
        payload.put("processInstances", runtimeService.createProcessInstanceQuery().count());
        payload.put("engineVersion", managementService.getProperties().get("flowable.engine.version"));
        return Result.ok(payload);
    }
}
