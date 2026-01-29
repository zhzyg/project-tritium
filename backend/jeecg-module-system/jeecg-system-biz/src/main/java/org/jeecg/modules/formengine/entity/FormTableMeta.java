package org.jeecg.modules.formengine.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;
import org.springframework.format.annotation.DateTimeFormat;

import java.util.Date;

@Data
@TableName("form_table_meta")
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@ApiModel(value = "form_table_meta", description = "Form table metadata")
public class FormTableMeta {
    @TableId(type = IdType.INPUT)
    @ApiModelProperty("id")
    private String id;

    @ApiModelProperty("form key")
    private String formKey;

    @TableField("table_name")
    @ApiModelProperty("table name")
    private String tableName;

    @TableField("schema_version")
    @ApiModelProperty("schema version")
    private Integer schemaVersion;

    @ApiModelProperty("status")
    private Integer status;

    @TableField("created_time")
    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @ApiModelProperty("created time")
    private Date createdTime;

    @TableField("updated_time")
    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @ApiModelProperty("updated time")
    private Date updatedTime;
}
