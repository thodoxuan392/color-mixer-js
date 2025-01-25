# Command for controlling the Color Mixer Machine

| COMMAND                     | ARGS                | Raw Bytes                                                                                                        |
| --------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Reset Machine               |                     | 120, 1, 0, 0, 0, 121                                                                                             |
| Request Version             |                     | 120, 2, 0, 0, 0, 121                                                                                             |
| Get setting                 |                     | 120, 3, 0, 0, 0, 121                                                                                             |
| Ping                        |                     | 120, 5, 0, 0, 0, 121                                                                                             |
| Sync Time                   | 2025/1/6 19:16:39   | 120, 7, 7, 7, 233, 1,6, 19, 16, 39, 26, 147,121                                                                  |
| Get Real Time               |                     | 120, 8, 0, 0, 0, 121                                                                                             |
| Reset Default Setting       |                     | 120, 9, 0, 0, 0, 121                                                                                             |
| Change Color Volume Index 1 | Volume: 2000ml      | 120, 16, 5, 1, 68, 250, 0, 0, 42, 175, 121                                                                       |
| Change Color Volume Index 1 | Volume: 50ml        | 120, 16, 5, 1, 66,72, 0, 0, 157, 169,121                                                                         |
| Change Color Volume Index 1 | Volume: 10ml        | 120, 16, 5, 1, 65, 32, 0, 0, 52, 191,121                                                                         |
| Change Color Volume Index 2 | Volume: 50ml        | 120, 16, 5, 2, 66, 72, 0, 0, 115, 123,121                                                                        |
| Change Color Volume Index 2 | Volume: 10ml        | 120, 16, 5, 2, 65, 32, 0, 0, 218, 109,121                                                                        |
| Change Color Volume All     | Volume: 100ml       | 120, 24, 4, 66, 200, 0, 0, 12, 162, 121                                                                          |
| Change Color Volume All     | Volume: 10ml        | 120, 24, 4, 65, 32, 0, 0, 158, 238,121                                                                           |
| Change Color Volume All     | Volume: 1ml         | 120, 24, 4, 65, 32, 0, 0, 158, 238,121                                                                           |
| Change Color Volume All     | Volume: 0.1ml       | 120, 24, 4, 61, 204, 204, 205, 29, 33,121                                                                        |
| Change Color Volume All     | Volume: 0.01ml      | 120, 24, 4, 60, 35, 215, 10, 145, 183,121                                                                        |
| Start Mix Color             |                     | 120, 18, 1, 0, 0, 0, 121                                                                                         |
| Stop Mix Color              |                     | 120, 18, 1, 1, 16, 33, 121                                                                                       |
| Pause Mix Color             |                     | 120, 18, 1, 2, 32, 66, 121                                                                                       |
| Resume Mix Color            |                     | 120, 18, 1, 3, 48, 99, 121                                                                                       |
| Open Door                   |                     | 120, 21, 1, 1, 16, 33, 121                                                                                       |
| Close Door                  |                     | 120, 21, 1, 0, 0, 0, 121                                                                                         |
| Set expire time             | 2025/10/14 20:13:00 | 120, 22, 23, 71, 65, 34, 80, 11, 88,95, 66, 93, 86, 52, 59, 88, 86, 0,29, 7, 233, 10, 14, 20, 13, 0, 4, 200, 121 |
| Get expire time             |                     | 120, 23, 0, 0, 0, 121                                                                                            |
| Start push flow             |                     | 120, 96, 2, 0, 0, 0, 0, 121                                                                                      |
| Start push flow reverse     |                     | 120, 96, 2, 0, 1, 16, 33, 121                                                                                    |
| Stop push flow              |                     | 120, 96, 2, 1,0, 51, 49, 121                                                                                     |
| Start push flow dual        |                     | 120, 97, 2, 0,0, 0, 0,121                                                                                        |
| Stop push flow dual         |                     | 120, 97, 2, 1, 0, 51, 49,121                                                                                     |
