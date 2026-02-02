package org.jeecg.modules.flowable.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.Date;

@Data
@ApiModel(value = "FlowableTaskCommentResp", description = "Flowable task comment response")
public class FlowableTaskCommentResp {
    @ApiModelProperty("comment id")
    private String id;

    @ApiModelProperty("user id")
    private String userId;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @ApiModelProperty("time")
    private Date time;

    @ApiModelProperty("message")
    private String message;
}
