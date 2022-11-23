import * as React from 'react';
import {
    Avatar,
    Box, Button,
    Container,
    createTheme,
    CssBaseline,
    FormControl,
    InputLabel,
    MenuItem,
    Select, TextField,
    ThemeProvider, Typography
} from "@mui/material";
import {Description} from "@mui/icons-material";

const theme = createTheme();

interface Props {
    vs: any;
    currentPath: string;
}

export default function GenerateInput(props: Props) {

    const handleSubmit = (event: any) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);

        const name = data.get('name');
        const type = data.get('type');
        const path = data.get('path');

        if(name && type && path) {
            props.vs.postMessage({
                message:'generate', name: name, type: type, path: path
            })
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <Container component="main" maxWidth="xs">
                <CssBaseline />
                <Box
                    sx={{
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                        <Description />
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        Generate File
                    </Typography>
                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="name"
                            label="Name"
                            name="name"
                            autoFocus
                        />
                        <FormControl fullWidth>
                            <InputLabel id="typeLabel">Type</InputLabel>
                            <Select
                                required
                                fullWidth
                                id="type"
                                labelId="typeLabel"
                                name="type"
                            >
                                <MenuItem value="bpmn">bpmn</MenuItem>
                                <MenuItem value="dmn">dmn</MenuItem>
                                <MenuItem value="form">form</MenuItem>
                                <MenuItem value="element-template">element-template</MenuItem>
                                <MenuItem value="config">config</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="path"
                            label="Path"
                            name="path"
                            defaultValue={props.currentPath}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="outlined"
                            sx={{ mt: 3, mb: 2 }}
                        > generate </Button>
                    </Box>
                </Box>
            </Container>
        </ThemeProvider>
    );
}
