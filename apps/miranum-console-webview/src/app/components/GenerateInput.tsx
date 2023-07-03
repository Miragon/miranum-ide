import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useVsMessage } from "./Hooks/Message";
import {
    Avatar,
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from "@mui/material";
import { Description } from "@mui/icons-material";
import FileSelector from "./UI/FileSelector";
import { Artifact, MiranumConfig, MiranumCore } from "@miranum-ide/miranum-core";
import { MessageType } from "@miranum-ide/vscode/shared/miranum-console";

interface Props {
    config?: MiranumConfig;
    currentPath: string;
    name: string;
    type: string;
}

const GenerateInput: React.FC<Props> = (props) => {
    const [name, setName] = useState<string>(props.name);
    const [type, setType] = useState<string>(props.type);
    const [path, setPath] = useState<string>(props.currentPath);
    const [pressed, setPressed] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const inputChange = useVsMessage(MessageType.CHANGEDINPUT); // "changedInput");
    const sendArtifactMessage = useVsMessage(MessageType.GENERATEARTIFACT); // "generateArtifact");
    const miranumCore = useMemo(() => {
        return props.config ? new MiranumCore(props.config) : new MiranumCore();
    }, [props.config]);

    useEffect(() => {
        setPath(props.currentPath);
    }, [props.currentPath]);

    const generate = useCallback(() => {
        if (name !== "" && path !== "") {
            miranumCore
                .generateArtifact(
                    name,
                    type,
                    miranumCore.projectConfig?.name ?? "",
                    path,
                )
                .then((artifact: Artifact) => {
                    sendArtifactMessage({
                        path: path,
                        artifact: artifact,
                    });
                })
                .then(() => setError(""))
                .catch((err) => setError(err.message));
        }
    }, [name, path, miranumCore, type, sendArtifactMessage]);

    return (
        <FormControl
            sx={{
                marginTop: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
            }}
        >
            <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
                <Description />
            </Avatar>
            <Typography component="h2" variant="h5">
                GENERATE A NEW FILE
            </Typography>
            <Box component="form" noValidate sx={{ mt: 1 }}>
                <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="name"
                    label="Name"
                    name="name"
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        inputChange({ name: e.target.value, type: type });
                    }}
                    autoFocus
                    error={name === ""}
                    helperText={
                        name === "" && pressed ? "You have to insert a name!" : " "
                    }
                />
                <FormControl fullWidth required>
                    <InputLabel id="typeLabel">Type</InputLabel>
                    <Select
                        id="type"
                        labelId="typeLabel"
                        name="type"
                        value={type}
                        sx={{ mb: "28px" }}
                        onChange={(e) => {
                            setType(e.target.value);
                            inputChange({ name: name, type: e.target.value });
                        }}
                    >
                        <MenuItem value="bpmn">bpmn</MenuItem>
                        <MenuItem value="dmn">dmn</MenuItem>
                        <MenuItem value="form">form</MenuItem>
                        <MenuItem value="element-template">element-template</MenuItem>
                        <MenuItem value="config">config</MenuItem>
                    </Select>
                </FormControl>
                {!miranumCore.projectConfig && (
                    <FileSelector path={path} setPath={(p: string) => setPath(p)} />
                )}
                <Button
                    onClick={() => {
                        setPressed(!name || !path);
                        generate();
                    }}
                    fullWidth
                    variant="contained"
                    color="secondary"
                    sx={{ mt: 3, mb: 2 }}
                >
                    generate
                </Button>
                {error !== "" && (
                    <Typography variant="h6" color="red" textAlign="center">
                        {error}
                    </Typography>
                )}
            </Box>
        </FormControl>
    );
};

export default GenerateInput;
